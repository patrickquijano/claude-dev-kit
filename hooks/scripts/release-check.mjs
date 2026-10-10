// Release gate shared by the PR/MR skills, the project PreToolUse hook, and CI: changelog and version checks.
// Modes: `check` (validate), `bump` (write the required version), `hook` (PreToolUse stdin JSON; exit 2 blocks).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { git, readState, sha, statePath, unsafeState, writeState } from './git-state.mjs';
import { readStdin } from './tools.mjs';

export const POLICY_FILE = '.claude/release-policy.json';
const MCP_CREATE = 'mcp__plugin_gitlab_gitlab__save_merge_request';
const LEVELS = ['patch', 'minor', 'major'];

const out = (r) => (r.stdout ? r.stdout.toString() : '').trim();
const fail = (code, message, fix) => ({ code, message, fix });

const globRe = (g) => {
  let re = '';
  for (let i = 0; i < g.length; i++) {
    if (g[i] === '*' && g[i + 1] === '*') {
      if (g[i + 2] === '/') {
        re += '(?:.*/)?';
        i += 2;
      } else {
        re += '.*';
        i += 1;
      }
    } else if (g[i] === '*') re += '[^/]*';
    else re += g[i].replace(/[.+^${}()|[\]\\?]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
};
const matchAny = (file, globs) => globs.some((g) => globRe(g).test(file));

const parseVer = (v) => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v ?? '').trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};
const cmpVer = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const bumpVer = ([a, b, c], level) =>
  level === 'major' ? [a + 1, 0, 0] : level === 'minor' ? [a, b + 1, 0] : [a, b, c + 1];
const fmt = (v) => v.join('.');

export function loadPolicy(cwd) {
  const root = out(git(cwd, ['rev-parse', '--show-toplevel'])) || cwd;
  const file = path.join(root, POLICY_FILE);
  if (!existsSync(file)) return { root, policy: null };
  const raw = readFileSync(file, 'utf8');
  const p = JSON.parse(raw);
  return {
    root,
    hash: sha(raw),
    policy: {
      changelog: 'CHANGELOG.md',
      defaultBranch: 'main',
      remote: 'origin',
      versionFiles: [],
      userFacing: [],
      exempt: [],
      ...p
    }
  };
}

// Highest level the commit subjects and bodies require: breaking = major, feat = minor, else patch.
export function levelOf(commits) {
  let level = 0;
  for (const { subject, body } of commits) {
    const m = /^(\w+)(?:\([^)]*\))?(!)?:/.exec(subject);
    if (m?.[2] || /^BREAKING[ -]CHANGE:/m.test(body)) return 'major';
    if (m?.[1] === 'feat') level = Math.max(level, 1);
  }
  return LEVELS[level];
}

const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
export function changelogParts(text = '') {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^##\s*\[?unreleased\]?/i.test(l));
  const bullets = [];
  if (start >= 0) {
    for (const l of lines.slice(start + 1)) {
      if (/^##\s/.test(l)) break;
      const m = /^\s*[-*]\s+(.*\S)/.exec(l);
      if (m) bullets.push(norm(m[1]));
    }
  }
  const releases = lines.map((l) => /^##\s*\[(\d+\.\d+\.\d+)\]/.exec(l)?.[1]).filter(Boolean);
  return { bullets, releases };
}

const readKey = (text, key) => {
  try {
    return JSON.parse(text)[key];
  } catch {
    return undefined;
  }
};

const show = (cwd, ref, file) => {
  const r = git(cwd, ['show', `${ref}:${file}`]);
  return r.status === 0 ? r.stdout.toString() : null;
};

// Core validation. Returns {skipped?, ok, level, required, failures, notes}.
export function evaluate(cwd, { target, ci = false, prePush = false } = {}) {
  const { root, policy } = loadPolicy(cwd);
  if (!policy) return { skipped: true, ok: true, failures: [], notes: ['skipped: no release policy'] };
  cwd = root;
  const tgt = target || policy.defaultBranch;
  const remote = policy.remote;
  const failures = [];
  const notes = [];
  const done = (extra = {}) => ({ ok: failures.length === 0, failures, notes, ...extra });

  if (git(cwd, ['remote', 'get-url', remote]).status !== 0) {
    failures.push(
      fail('no-remote', `remote "${remote}" is not configured`, `git remote add ${remote} <url>, then push the branch`)
    );
    return done();
  }
  if (!ci && unsafeState(cwd)) {
    failures.push(
      fail('unsafe-state', 'merge, rebase, or detached HEAD in progress', 'finish or abort it, then retry')
    );
    return done();
  }
  const ref = `${remote}/${tgt}`;
  // CI checks out with all branches and no stored credentials, so an existing ref is used as is.
  const have = ci && git(cwd, ['rev-parse', '--verify', '-q', `refs/remotes/${ref}`]).status === 0;
  const fetched = have
    ? { status: 0 }
    : git(cwd, ['fetch', '--quiet', remote, `+refs/heads/${tgt}:refs/remotes/${ref}`], 60_000);
  if (fetched.status !== 0) {
    failures.push(
      fail('fetch-failed', `cannot fetch ${ref}`, `check network, remote access, and that branch "${tgt}" exists`)
    );
    return done();
  }
  const mb = out(git(cwd, ['merge-base', ref, 'HEAD']));
  if (!mb) {
    failures.push(fail('no-merge-base', `HEAD shares no history with ${ref}`, 'rebase the branch onto the target'));
    return done();
  }

  const committed = out(git(cwd, ['diff', '--name-only', `${mb}`, 'HEAD']))
    .split('\n')
    .filter(Boolean);
  const entries = git(cwd, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
    .stdout.toString()
    .split('\0')
    .filter(Boolean);
  const dirty = [];
  for (let i = 0; i < entries.length; i++) {
    dirty.push(entries[i].slice(3));
    if (/^[RC]/.test(entries[i])) i++; // rename or copy: the next entry is the original path
  }
  const touched = [...new Set([...committed, ...dirty])];
  const relevant = touched.filter((f) => matchAny(f, policy.userFacing));
  const exemptHits = new Map();
  const needed = relevant.filter((f) => {
    const hit = policy.exempt.find((e) => matchAny(f, [e.glob]));
    if (hit) exemptHits.set(hit.glob, hit.reason);
    return !hit;
  });
  for (const [glob, reason] of exemptHits) notes.push(`exempt ${glob}: ${reason}`);
  if (needed.length === 0) {
    notes.push('skipped: no release-relevant changes');
    return done({ skipped: true });
  }

  const log = out(git(cwd, ['log', '--no-merges', '--format=%s%x00%b%x01', `${mb}..HEAD`]));
  const commits = log
    .split('\x01')
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e) => {
      const [subject, body = ''] = e.split('\0');
      return { subject: subject.trim(), body };
    });
  const level = levelOf(commits);

  // Version: every file must equal target-tip version plus the required level.
  const heads = policy.versionFiles.map((v) => {
    const abs = path.join(cwd, v.path);
    return { ...v, head: existsSync(abs) ? readKey(readFileSync(abs, 'utf8'), v.key) : undefined };
  });
  const baseRaw = policy.versionFiles.map((v) => readKey(show(cwd, ref, v.path) ?? '', v.key));
  const baseV = baseRaw.map(parseVer).find(Boolean) ?? null;
  const required = baseV ? bumpVer(baseV, level) : null;
  const headVs = heads.map((h) => parseVer(h.head));
  const fixBump = 'run /cdk:bump-version, then /cdk:commit-changes';

  if (heads.length === 0) notes.push('no versionFiles configured');
  if (heads.some((h, i) => !headVs[i])) {
    failures.push(
      fail(
        'version-invalid',
        `not a x.y.z version in: ${heads
          .filter((_, i) => !headVs[i])
          .map((h) => h.path)
          .join(', ')}`,
        fixBump
      )
    );
  } else if (new Set(headVs.map(fmt)).size > 1) {
    failures.push(
      fail('version-inconsistent', `files disagree: ${heads.map((h) => `${h.path}=${h.head}`).join(', ')}`, fixBump)
    );
  } else if (required && headVs[0]) {
    const c = cmpVer(headVs[0], required);
    const baseCmp = cmpVer(headVs[0], baseV);
    if (c !== 0) {
      const code = baseCmp === 0 ? 'version-unchanged' : c > 0 ? 'version-over-bumped' : 'version-lower';
      failures.push(
        fail(
          code,
          `version is ${fmt(headVs[0])}; ${level} change on ${ref}@${fmt(baseV)} requires ${fmt(required)}`,
          fixBump
        )
      );
    }
  }

  // Changelog: new bullet under Unreleased (or a new release section), no duplicates.
  const clFile = policy.changelog;
  const headCl = existsSync(path.join(cwd, clFile)) ? readFileSync(path.join(cwd, clFile), 'utf8') : null;
  if (headCl === null) {
    failures.push(
      fail('changelog-missing', `${clFile} does not exist`, 'run /cdk:write-changelog, then /cdk:commit-changes')
    );
  } else {
    const h = changelogParts(headCl);
    const b = changelogParts(show(cwd, mb, clFile) ?? '');
    const dup = h.bullets.find((x, i) => h.bullets.indexOf(x) !== i);
    const released = required && h.releases.includes(fmt(required)) && !b.releases.includes(fmt(required));
    if (dup)
      failures.push(
        fail('changelog-duplicate', `duplicate Unreleased entry: "${dup.slice(0, 60)}"`, 'remove the duplicate line')
      );
    if (!released && !h.bullets.some((x) => !b.bullets.includes(x))) {
      failures.push(
        fail(
          'changelog-unchanged',
          `no new entry under Unreleased in ${clFile}`,
          'run /cdk:write-changelog, then /cdk:commit-changes'
        )
      );
    }
  }

  // Generated changes committed and pushed.
  if (!ci) {
    const owned = [clFile, ...policy.versionFiles.map((v) => v.path)];
    const open = dirty.filter((f) => owned.includes(f));
    if (open.length)
      failures.push(
        fail('uncommitted', `uncommitted: ${open.join(', ')}`, 'run /cdk:commit-changes (commits and pushes)')
      );
    if (!prePush) {
      const branch = out(git(cwd, ['symbolic-ref', '--short', 'HEAD']));
      const remoteSha = out(git(cwd, ['ls-remote', '--heads', remote, branch], 30_000)).split(/\s/)[0];
      if (remoteSha !== out(git(cwd, ['rev-parse', 'HEAD']))) {
        failures.push(
          fail(
            'unpushed',
            `HEAD is not on ${remote}/${branch}`,
            `git push -u ${remote} HEAD:${branch} (or /cdk:commit-changes)`
          )
        );
      }
    }
  }
  const drivers = commits
    .filter((c) => levelOf([c]) === level)
    .map((c) => c.subject)
    .slice(0, 5);
  return done({
    drivers,
    level,
    required: required ? fmt(required) : null,
    base: baseV ? fmt(baseV) : null,
    target: tgt
  });
}

// Writes the required version into every version file; idempotent.
export function bump(cwd, { target } = {}) {
  const r = evaluate(cwd, { target, ci: false, prePush: true });
  if (r.skipped || !r.required) return { changed: [], ...r };
  const { root, policy } = loadPolicy(cwd);
  const changed = [];
  for (const v of policy.versionFiles) {
    const abs = path.join(root, v.path);
    const text = readFileSync(abs, 'utf8');
    const re = new RegExp(`("${v.key}"\\s*:\\s*")([^"]*)(")`);
    const m = re.exec(text);
    if (!m) throw new Error(`key "${v.key}" not found in ${v.path}`);
    if (m[2] !== r.required) {
      writeFileSync(abs, text.replace(re, `$1${r.required}$3`));
      changed.push({ path: v.path, from: m[2], to: r.required });
    }
  }
  return { ...r, changed };
}

// Minimal shell tokenizer: quotes honored; `&&`, `||`, `;`, `|` split segments.
export function segments(command) {
  const segs = [[]];
  let tok = '';
  let q = '';
  let has = false;
  const push = () => {
    if (has) segs.at(-1).push(tok);
    tok = '';
    has = false;
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (q) {
      if (c === q) q = '';
      else if (c === '\\' && q === '"' && i + 1 < command.length) tok += command[++i];
      else tok += c;
    } else if (c === '"' || c === "'") {
      q = c;
      has = true;
    } else if (/\s/.test(c)) push();
    else if (c === ';' || c === '|' || c === '&') {
      push();
      if (c !== '&' || command[i + 1] === '&') {
        if (command[i + 1] === c && c !== ';') i++;
        segs.push([]);
      }
    } else {
      tok += c;
      has = true;
    }
  }
  push();
  return segs.filter((s) => s.length);
}

const flag = (t, names) => {
  for (let i = 0; i < t.length; i++) {
    for (const n of names) {
      if (t[i] === n) return t[i + 1];
      if (t[i].startsWith(`${n}=`)) return t[i].slice(n.length + 1);
    }
  }
  return undefined;
};
const field = (t, key) => {
  for (let i = 0; i < t.length; i++) {
    if (/^(-f|-F|--field|--raw-field)$/.test(t[i]) && t[i + 1]?.startsWith(`${key}=`))
      return t[i + 1].slice(key.length + 1);
  }
  return undefined;
};
const apiPost = (t) => {
  const m = flag(t, ['-X', '--method']);
  if (m) return m.toUpperCase() === 'POST';
  return t.some((x) => /^(-f|-F|--field|--raw-field|--input)$/.test(x));
};

// Target branch (or null) when the tool call creates a PR/MR; undefined when it does not.
export function createTarget(event, defaultBranch) {
  if (event.tool_name === MCP_CREATE) {
    const i = event.tool_input ?? {};
    return i.merge_request_iid ? undefined : i.target_branch || defaultBranch;
  }
  if (event.tool_name !== 'Bash') return undefined;
  for (const raw of segments(String(event.tool_input?.command ?? ''))) {
    const t = [...raw];
    while (t.length && /^[A-Za-z_]\w*=/.test(t[0])) t.shift();
    const [bin, ...rest] = t;
    const next = (w) => rest.indexOf(w) >= 0 && rest[rest.indexOf(w) + 1];
    if (bin === 'gh') {
      if (next('pr') === 'create') return flag(rest, ['-B', '--base']) || defaultBranch;
      if (rest[0] === 'api' && rest.some((x) => /\/pulls$/.test(x)) && apiPost(rest))
        return field(rest, 'base') || defaultBranch;
    } else if (bin === 'glab') {
      if (['create', 'new'].includes(next('mr'))) return flag(rest, ['-b', '--target-branch']) || defaultBranch;
      if (rest[0] === 'api' && rest.some((x) => /merge_requests$/.test(x)) && apiPost(rest))
        return field(rest, 'target_branch') || defaultBranch;
    }
  }
  return undefined;
}

export function report(r) {
  if (r.skipped) return r.notes.join('\n');
  const lines = r.failures.map((f) => `release-check: ${f.code}: ${f.message}\n  fix: ${f.fix}`);
  return lines.join('\n');
}

async function runHook() {
  let event;
  try {
    event = JSON.parse(await readStdin());
  } catch {
    return 0;
  }
  const cwd = event.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  let loaded;
  try {
    loaded = loadPolicy(cwd);
  } catch (e) {
    process.stderr.write(`release-check: invalid ${POLICY_FILE}: ${e.message}\n`);
    return 2;
  }
  if (!loaded.policy) return 0;
  const target = createTarget(event, loaded.policy.defaultBranch);
  if (!target) return 0;

  const rel = [loaded.policy.changelog, ...loaded.policy.versionFiles.map((v) => v.path)];
  const head = out(git(loaded.root, ['rev-parse', 'HEAD']));
  const relStatus = out(git(loaded.root, ['status', '--porcelain=v1', '--', ...rel]));
  const key = sha(`${head}|${target}|${loaded.hash}|${relStatus}`);
  const file = statePath('release-check', loaded.root);
  if (readState(file).pass === key) return 0;

  const r = evaluate(cwd, { target });
  if (r.ok) {
    writeState(file, { pass: key });
    return 0;
  }
  process.stderr.write(
    `${report(r)}\nBlocked PR/MR creation. Fix, commit, push, then retry. No bypass: exceptions live in ${POLICY_FILE} (exempt, with a reason).\n`
  );
  return 2;
}

async function main() {
  const [mode = 'check', ...args] = process.argv.slice(2);
  const opt = (n) => args[args.indexOf(n) + 1];
  const cwd = process.cwd();
  if (mode === 'hook') return runHook();
  const target = args.includes('--target') ? opt('--target') : undefined;
  try {
    if (mode === 'bump') {
      const r = bump(cwd, { target });
      console.log(
        args.includes('--json')
          ? JSON.stringify(r)
          : r.skipped
            ? r.notes.join('\n')
            : `level ${r.level}: ${r.changed.length ? r.changed.map((c) => `${c.path} ${c.from} -> ${c.to}`).join(', ') : 'already at ' + r.required}`
      );
      return r.failures?.some(
        (f) => !f.code.startsWith('version-') && !f.code.startsWith('changelog-') && f.code !== 'uncommitted'
      )
        ? 1
        : 0;
    }
    const r = evaluate(cwd, { target, ci: args.includes('--ci'), prePush: args.includes('--pre-push') });
    console.log(args.includes('--json') ? JSON.stringify(r) : report(r) || `ok: ${r.level} -> ${r.required}`);
    return r.ok ? 0 : 1;
  } catch (e) {
    console.error(`release-check: ${e.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
