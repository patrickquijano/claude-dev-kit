// PreToolUse hook: before a PR or MR into main is created, bump the plugin version once, commit it, and push the branch.
// Exit 2 with an actionable message blocks creation (ambiguous version, dirty version files, failed step); never force-pushes.
import { readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { git, unsafeState } from '../../hooks/scripts/git-state.mjs';

const TARGET = 'main';
const PLUGIN = '.claude-plugin/plugin.json';
const MARKETPLACE = '.claude-plugin/marketplace.json';
const SEMVER = /^\d+\.\d+\.\d+$/;
const LOCK_MS = 10 * 60_000;
const MCP_TOOL = 'mcp__plugin_gitlab_gitlab__save_merge_request';
const FLAGS = {
  gh: { target: ['-B', '--base'], source: ['-H', '--head'], repo: ['-R', '--repo'] },
  glab: { target: ['-b', '--target-branch'], source: ['-s', '--source-branch'], repo: ['-R', '--repo'] }
};

class Block extends Error {}
const block = (message) => {
  throw new Block(message);
};

async function readEvent() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  try {
    return JSON.parse(data) ?? {};
  } catch {
    return {};
  }
}

// Shell-like split: quotes and backslashes honored; control operators become their own tokens.
function tokenize(command) {
  const tokens = [];
  let cur = '';
  let quote = '';
  let has = false;
  const push = () => {
    if (has) tokens.push(cur);
    cur = '';
    has = false;
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote) {
      if (c === quote) quote = '';
      else if (c === '\\' && quote === '"' && i + 1 < command.length) cur += command[++i];
      else cur += c;
    } else if (c === "'" || c === '"') {
      quote = c;
      has = true;
    } else if (c === '\\' && i + 1 < command.length) {
      cur += command[++i];
      has = true;
    } else if (/\s/.test(c) && c !== '\n') {
      push();
    } else if (';&|\n'.includes(c)) {
      push();
      if ((c === '&' || c === '|') && command[i + 1] === c) i++;
      tokens.push(';');
    } else {
      cur += c;
      has = true;
    }
  }
  push();
  return tokens;
}

// The value of the first of `names` in `args`, as `-X value` or `--long=value`.
function flagValue(args, names) {
  for (let i = 0; i < args.length; i++) {
    for (const n of names) {
      if (args[i] === n) return args[i + 1] ?? '';
      if (n.startsWith('--') && args[i].startsWith(`${n}=`)) return args[i].slice(n.length + 1);
    }
  }
  return '';
}

// Creation intent from the tool call: { target, source, foreign } or null when the call is not a create.
function intent(event) {
  const input = event.tool_input ?? {};
  if (event.tool_name === MCP_TOOL) {
    if (input.merge_request_iid) return null;
    return { target: input.target_branch ?? '', source: input.source_branch ?? '', foreign: false };
  }
  if (event.tool_name !== 'Bash' || typeof input.command !== 'string') return null;
  const tokens = tokenize(input.command);
  for (let i = 0; i < tokens.length - 2; i++) {
    const tool = tokens[i] === 'gh' ? 'gh' : tokens[i] === 'glab' ? 'glab' : '';
    const verb = tool === 'gh' ? 'pr' : 'mr';
    if (!tool || tokens[i + 1] !== verb || !['create', 'new'].includes(tokens[i + 2])) continue;
    if (tool === 'gh' && tokens[i + 2] !== 'create') continue;
    let end = i + 3;
    while (end < tokens.length && tokens[end] !== ';') end++;
    const args = tokens.slice(i + 3, end);
    const f = FLAGS[tool];
    const head = flagValue(args, f.source);
    return {
      target: flagValue(args, f.target),
      source: head.includes(':') ? head.split(':').pop() : head,
      foreign: Boolean(flagValue(args, f.repo))
    };
  }
  return null;
}

function run(cwd, args, timeout) {
  const r = git(cwd, args, timeout);
  return {
    ok: r.status === 0,
    out: r.stdout?.toString().trim() ?? '',
    err: (r.stderr?.toString() || r.error?.message || '').trim()
  };
}

function defaultBranch(cwd) {
  const head = run(cwd, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
  if (head.ok) return head.out.replace(/^origin\//, '');
  return run(cwd, ['rev-parse', '--verify', '-q', `refs/remotes/origin/${TARGET}`]).ok ? TARGET : '';
}

function acquire(file) {
  for (let i = 0; i < 2; i++) {
    try {
      writeFileSync(file, String(process.pid), { flag: 'wx' });
      return true;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try {
        if (Date.now() - statSync(file).mtimeMs < LOCK_MS) return false;
        unlinkSync(file);
      } catch {
        // Raced with another run; the retry decides.
      }
    }
  }
  return false;
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    return block(`${label} is not valid JSON; fix it, then retry.`);
  }
}

// Object text enclosing `index`, found by brace depth.
function enclosingObject(text, index) {
  let start = index;
  for (let depth = 0; start >= 0; start--) {
    if (text[start] === '}') depth++;
    else if (text[start] === '{' && depth-- === 0) break;
  }
  let end = index;
  for (let depth = 0; end < text.length; end++) {
    if (text[end] === '{') depth++;
    else if (text[end] === '}' && depth-- === 0) break;
  }
  return start < 0 || end >= text.length ? null : [start, end + 1];
}

// Replaces the one `"version"` equal to `from` inside text[range]; anything else is ambiguous.
function replaceVersion(text, [from, to], range, label) {
  const [a, b] = range ?? [0, text.length];
  const re = new RegExp(`("version"\\s*:\\s*")${from.replaceAll('.', '\\.')}(")`, 'g');
  const part = text.slice(a, b);
  if ((part.match(re) ?? []).length !== 1)
    block(`${label} has no single "version": "${from}" to update; fix it by hand, then retry.`);
  return text.slice(0, a) + part.replace(re, `$1${to}$2`) + text.slice(b);
}

// Level from the unique commits: breaking → major, else feat → minor, else patch.
function levelOf(log) {
  let level = 'patch';
  for (const entry of log.split('\x1e').filter((e) => e.trim())) {
    const [subject = '', body = ''] = entry.trim().split('\x1f');
    if (/^[a-z]+(\([^)]*\))?!:/.test(subject) || /^BREAKING[ -]CHANGE:/m.test(body)) return 'major';
    if (/^feat(\([^)]*\))?:/.test(subject)) level = 'minor';
  }
  return level;
}

function bump(version, level) {
  const [maj, min, pat] = version.split('.').map(Number);
  if (level === 'major') return `${maj + 1}.0.0`;
  if (level === 'minor') return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

function bumpVersion(cwd, want) {
  const fetched = run(cwd, ['fetch', 'origin', TARGET], 60_000);
  if (!fetched.ok) block(`git fetch origin ${TARGET} failed: ${fetched.err}. Fix the remote or network, then retry.`);

  const branch = run(cwd, ['symbolic-ref', '--short', 'HEAD']).out;
  if (!branch || branch === TARGET) return null;
  if (want.source && want.source !== branch)
    block(`The PR source is ${want.source} but ${branch} is checked out; switch to ${want.source}, then retry.`);

  const status = git(cwd, ['status', '--porcelain=v1', '-z', '--untracked-files=no']).stdout?.toString() ?? '';
  if (unsafeState(cwd, status))
    block('A merge, rebase, cherry-pick, or detached HEAD is in progress; finish or abort it, then retry.');
  const dirty = run(cwd, ['status', '--porcelain', '--', PLUGIN, MARKETPLACE]);
  if (dirty.out)
    block(
      `${PLUGIN} or ${MARKETPLACE} has uncommitted changes:\n${dirty.out}\nCommit or discard them (cdk:commit-changes), then retry.`
    );

  const log = run(cwd, ['log', '--no-merges', '--format=%s%x1f%b%x1e', `origin/${TARGET}..HEAD`]);
  if (!log.ok) block(`git log origin/${TARGET}..HEAD failed: ${log.err}`);
  if (!log.out) return null;

  const pluginText = readFileSync(path.join(cwd, PLUGIN), 'utf8');
  const plugin = parseJson(pluginText, PLUGIN);
  const mainText = run(cwd, ['show', `origin/${TARGET}:${PLUGIN}`]);
  if (!mainText.ok) block(`${PLUGIN} is missing on origin/${TARGET}: ${mainText.err}`);
  const mainVersion = parseJson(mainText.out, `origin/${TARGET}:${PLUGIN}`).version;
  const branchVersion = plugin.version;
  for (const [where, v] of [
    [`${PLUGIN} on origin/${TARGET}`, mainVersion],
    [`${PLUGIN} on this branch`, branchVersion]
  ]) {
    if (typeof v !== 'string' || !SEMVER.test(v))
      block(`${where} has version ${JSON.stringify(v)}, not X.Y.Z; fix it, then retry.`);
  }

  const base = run(cwd, ['merge-base', 'HEAD', `origin/${TARGET}`]);
  const baseText = base.ok ? run(cwd, ['show', `${base.out}:${PLUGIN}`]) : base;
  const baseVersion = baseText.ok ? parseJson(baseText.out, `merge-base:${PLUGIN}`).version : null;
  if (baseVersion !== mainVersion)
    block(
      `origin/${TARGET} moved to ${mainVersion} since this branch forked at ${baseVersion}; rebase onto origin/${TARGET} (cdk:rebase-onto), then retry.`
    );

  const marketText = readFileSync(path.join(cwd, MARKETPLACE), 'utf8');
  const entry = (parseJson(marketText, MARKETPLACE).plugins ?? []).find((p) => p.name === plugin.name);
  if (entry && 'version' in entry && entry.version !== branchVersion) {
    block(
      `Version source is ambiguous: ${PLUGIN} says ${branchVersion}, ${MARKETPLACE} says ${entry.version}. Make them equal, then retry.`
    );
  }

  const level = levelOf(log.out);
  const target = bump(mainVersion, level);
  if (branchVersion === target)
    return { message: `cdk version ${target} (${level}) is already bumped; nothing to commit.`, branch };
  if (branchVersion !== mainVersion) {
    const last = run(cwd, ['log', '-1', '--format=%s', `origin/${TARGET}..HEAD`, '--', PLUGIN]).out;
    if (last !== `chore(release): bump version to ${branchVersion}`) {
      block(
        `${PLUGIN} is ${branchVersion}, but the commits need ${target} (${level} from ${mainVersion}) and ${branchVersion} was not set by this hook. Set it to ${target} or revert it to ${mainVersion}, then retry.`
      );
    }
  }

  const next = replaceVersion(pluginText, [branchVersion, target], null, PLUGIN);
  const nextMarket =
    entry && 'version' in entry
      ? replaceVersion(
          marketText,
          [branchVersion, target],
          enclosingObject(marketText, marketText.indexOf(`"name": "${plugin.name}"`)),
          MARKETPLACE
        )
      : marketText;
  const files = [[PLUGIN, pluginText, next]];
  if (nextMarket !== marketText) files.push([MARKETPLACE, marketText, nextMarket]);
  const restore = () => files.forEach(([file, before]) => writeFileSync(path.join(cwd, file), before));
  files.forEach(([file, , after]) => writeFileSync(path.join(cwd, file), after));

  const versions = files.map(([file]) => {
    const doc = JSON.parse(readFileSync(path.join(cwd, file), 'utf8'));
    return file === PLUGIN ? doc.version : (doc.plugins ?? []).find((p) => p.name === plugin.name)?.version;
  });
  if (versions.some((v) => v !== target)) {
    restore();
    block(
      `Version locations disagree after the update (${versions.join(', ')}); restored. Fix the files by hand, then retry.`
    );
  }

  const committed = run(
    cwd,
    ['commit', '-m', `chore(release): bump version to ${target}`, '--', ...files.map(([file]) => file)],
    120_000
  );
  if (!committed.ok) {
    restore();
    block(`Version commit failed, files restored:\n${committed.err}\nFix the cause (hooks, signing), then retry.`);
  }
  return {
    message: `cdk version ${mainVersion} → ${target} (${level}), committed ${run(cwd, ['rev-parse', '--short', 'HEAD']).out}`,
    branch
  };
}

function pushBranch(cwd, branch) {
  const head = run(cwd, ['rev-parse', 'HEAD']).out;
  const remote = run(cwd, ['ls-remote', '--heads', 'origin', `refs/heads/${branch}`], 60_000);
  if (remote.ok && remote.out.split(/\s/)[0] === head) return 'already pushed';
  const pushed = run(cwd, ['push', '-u', 'origin', `HEAD:refs/heads/${branch}`], 120_000);
  if (!pushed.ok)
    block(
      `git push failed; the version commit is local only:\n${pushed.err}\nResolve it (pull or rebase, never force-push), then retry.`
    );
  return 'pushed';
}

async function main() {
  if (process.env.CDK_VERSION_BUMP) return;
  const want = intent(await readEvent());
  if (!want || want.foreign) return;
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (!run(cwd, ['rev-parse', '--is-inside-work-tree']).ok) return;
  if ((want.target || defaultBranch(cwd)) !== TARGET) return;
  // Children (git hooks, nested hook runs) inherit this and skip.
  process.env.CDK_VERSION_BUMP = '1';

  const lock = path.resolve(cwd, run(cwd, ['rev-parse', '--git-path', 'cdk-version-bump.lock']).out);
  if (!acquire(lock))
    block(
      'Another version bump is running (or crashed within 10 minutes); wait, or delete the lock file, then retry:\n' +
        lock
    );
  try {
    const done = bumpVersion(cwd, want);
    if (!done) return;
    const pushed = pushBranch(cwd, done.branch);
    process.stdout.write(JSON.stringify({ systemMessage: `${done.message}; ${pushed}.` }));
  } finally {
    try {
      unlinkSync(lock);
    } catch {
      // Already gone.
    }
  }
}

try {
  await main();
} catch (e) {
  if (!(e instanceof Block)) throw e;
  process.stderr.write(`Blocked: PR/MR creation stopped by the version-bump hook.\n${e.message}`);
  process.exit(2);
}
