// Release gate shared by the PR/MR skills, the plugin PreToolUse hook, and CI: changelog and version checks.
// Modes: `check` (validate), `bump` (write the required version), `hook` (PreToolUse stdin JSON; exit 2 blocks).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Standalone helpers (git runner, state files, stdin, entry guard); the script imports nothing from the plugin.
const sha = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 16);
const git = (cwd, args, timeout = 15_000) =>
  spawnSync('git', args, { cwd, maxBuffer: 1 << 28, timeout, windowsHide: true });
const expected = (err, ...codes) => codes.includes(err?.code);

// True mid-merge, rebase, cherry-pick, revert, bisect, on a detached HEAD, or with unmerged paths.
const unsafeState = (cwd, status = '') => {
  if (git(cwd, ['symbolic-ref', '-q', 'HEAD']).status !== 0) return true;
  for (const name of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'BISECT_LOG']) {
    const r = git(cwd, ['rev-parse', '--git-path', name]);
    if (r.status === 0 && existsSync(path.resolve(cwd, r.stdout.toString().trim()))) return true;
  }
  return status.split('\0').some((entry) => /^(U.|.U|AA|DD) /.test(entry));
};

const statePath = (name, cwd) => path.join(tmpdir(), `cdk-${name}-${sha(cwd)}-${sha('')}.json`);
const readState = (file) => {
  try {
    const s = JSON.parse(readFileSync(file, 'utf8'));
    return s && typeof s === 'object' ? s : {};
  } catch (e) {
    if (expected(e, 'ENOENT', 'ENOTDIR') || e instanceof SyntaxError) return {};
    throw e;
  }
};
const writeState = (file, state) => {
  try {
    writeFileSync(file, JSON.stringify(state));
  } catch (e) {
    // Unwritable temp dir; at worst the next run repeats.
    if (!expected(e, 'EACCES', 'EPERM', 'EROFS', 'ENOENT', 'ENOSPC')) throw e;
  }
};

const readJsonStdin = async (stream = process.stdin) => {
  let data = '';
  for await (const chunk of stream) data += chunk;
  const parsed = JSON.parse(data);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new TypeError('hook input is not a JSON object');
  return parsed;
};

// Runs `fn` only when this file is the entry script; an error it throws prints one line and sets `failCode`.
const runIfMain = async (metaUrl, fn, { label, failCode = 1 }) => {
  if (!process.argv[1] || metaUrl !== pathToFileURL(realpathSync(process.argv[1])).href) return;
  try {
    const code = await fn();
    if (typeof code === 'number') process.exitCode = code;
  } catch (err) {
    process.stderr.write(
      `cdk ${label}: ${String(err?.message ?? err)
        .split('\n')[0]
        .slice(0, 300)}\n`
    );
    process.exitCode = failCode;
  }
};

export const POLICY_FILE = '.claude/release-policy.json';
const MCP_CREATE = 'mcp__plugin_gitlab_gitlab__save_merge_request';
const LEVELS = ['patch', 'minor', 'major'];

// Side effects the logic needs; tests pass stubs, everything else uses the real ones.
const realDeps = {
  git,
  unsafeState,
  existsSync,
  readFileSync,
  writeFileSync,
  readState,
  writeState,
  statePath,
  readJsonStdin,
  stderr: (text) => process.stderr.write(text),
  log: (text) => console.log(text),
  error: (text) => console.error(text),
  env: process.env,
  cwd: () => process.cwd()
};
const withDeps = (deps) => ({ ...realDeps, ...deps });

// Joins a policy path onto the repo root and refuses anything that escapes it.
const inside = (root, rel) => {
  const abs = path.resolve(root, rel);
  const back = path.relative(root, abs);
  if (back.startsWith('..') || path.isAbsolute(back)) throw new Error(`path escapes the repo: ${rel}`);
  return abs;
};

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
  // eslint-disable-next-line security/detect-non-literal-regexp -- every glob character is escaped above
  return new RegExp(`^${re}$`);
};
const matchAny = (file, globs) => globs.some((g) => globRe(g).test(file));

const parseVer = (v) => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v ?? '').trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};
const cmpVer = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
// SemVer §4: while major is 0, a breaking change bumps minor and everything else bumps patch.
const bumpVer = ([a, b, c], level) => {
  if (a === 0) return level === 'major' ? [0, b + 1, 0] : [0, b, c + 1];
  return level === 'major' ? [a + 1, 0, 0] : level === 'minor' ? [a, b + 1, 0] : [a, b, c + 1];
};
const fmt = (v) => v.join('.');

export function loadPolicy(cwd, deps = {}) {
  const d = withDeps(deps);
  const root = out(d.git(cwd, ['rev-parse', '--show-toplevel'])) || cwd;
  const file = path.join(root, POLICY_FILE);
  if (!d.existsSync(file)) return { root, policy: null };
  const raw = d.readFileSync(file, 'utf8');
  const p = JSON.parse(raw);
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('policy must be a JSON object');
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
      versionReset: null,
      ...p
    }
  };
}

// Highest level the commit subjects and bodies require: breaking = major, feat = minor, else patch.
export function levelOf(commits) {
  let level = 0;
  for (const { subject, body } of commits) {
    // eslint-disable-next-line security/detect-unsafe-regex -- linear: the scope class cannot overlap the next token
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
  } catch (e) {
    // A version file that is not JSON has no such key.
    if (e instanceof SyntaxError) return undefined;
    throw e;
  }
};

const show = (d, cwd, ref, file) => {
  const r = d.git(cwd, ['show', `${ref}:${file}`]);
  return r.status === 0 ? r.stdout.toString() : null;
};

// Core validation. Returns {skipped?, ok, level, required, failures, notes}.
export function evaluate(cwd, { target, ci = false, prePush = false, pendingSubject = '' } = {}, deps = {}) {
  const d = withDeps(deps);
  const { root, policy } = loadPolicy(cwd, deps);
  if (!policy) return { skipped: true, ok: true, failures: [], notes: ['skipped: no release policy'] };
  cwd = root;
  const tgt = target || policy.defaultBranch;
  const remote = policy.remote;
  const failures = [];
  const notes = [];
  const done = (extra = {}) => ({ ok: failures.length === 0, failures, notes, ...extra });

  if (d.git(cwd, ['remote', 'get-url', remote]).status !== 0) {
    failures.push(
      fail('no-remote', `remote "${remote}" is not configured`, `git remote add ${remote} <url>, then push the branch`)
    );
    return done();
  }
  if (!ci && d.unsafeState(cwd)) {
    failures.push(
      fail('unsafe-state', 'merge, rebase, or detached HEAD in progress', 'finish or abort it, then retry')
    );
    return done();
  }
  const ref = `${remote}/${tgt}`;
  // CI checks out with all branches and no stored credentials, so an existing ref is used as is.
  const have = ci && d.git(cwd, ['rev-parse', '--verify', '-q', `refs/remotes/${ref}`]).status === 0;
  const fetched = have
    ? { status: 0 }
    : d.git(cwd, ['fetch', '--quiet', remote, `+refs/heads/${tgt}:refs/remotes/${ref}`], 60_000);
  if (fetched.status !== 0) {
    failures.push(
      fail('fetch-failed', `cannot fetch ${ref}`, `check network, remote access, and that branch "${tgt}" exists`)
    );
    return done();
  }
  const mb = out(d.git(cwd, ['merge-base', ref, 'HEAD']));
  if (!mb) {
    failures.push(fail('no-merge-base', `HEAD shares no history with ${ref}`, 'rebase the branch onto the target'));
    return done();
  }

  const committed = out(d.git(cwd, ['diff', '--name-only', `${mb}`, 'HEAD']))
    .split('\n')
    .filter(Boolean);
  const entries = d
    .git(cwd, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
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

  const log = out(d.git(cwd, ['log', '--no-merges', '--format=%s%x00%b%x01', `${mb}..HEAD`]));
  const commits = log
    .split('\x01')
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e) => {
      const [subject, body = ''] = e.split('\0');
      return { subject: subject.trim(), body };
    });
  // A subject for a commit still to come counts toward the required level.
  if (pendingSubject.trim()) commits.push({ subject: pendingSubject.trim(), body: '' });
  const level = levelOf(commits);

  // Version: every file must equal target-tip version plus the required level.
  const heads = policy.versionFiles.map((v) => {
    const abs = inside(cwd, v.path);
    return { ...v, head: d.existsSync(abs) ? readKey(d.readFileSync(abs, 'utf8'), v.key) : undefined };
  });
  const baseRaw = policy.versionFiles.map((v) => readKey(show(d, cwd, ref, v.path) ?? '', v.key));
  const baseV = baseRaw.map(parseVer).find(Boolean) ?? null;
  // A policy `versionReset` in a lower major than the base replaces the computed level; once the reset merges the majors match and it stops applying.
  const reset = parseVer(policy.versionReset?.version);
  const resetting = baseV && reset && reset[0] < baseV[0];
  if (resetting) notes.push(`reset ${fmt(baseV)} -> ${fmt(reset)}: ${policy.versionReset.reason ?? 'no reason given'}`);
  const required = resetting ? reset : baseV ? bumpVer(baseV, level) : null;
  const headVs = heads.map((h) => parseVer(h.head));
  const fixBump = 'run /cdk:bump-version, then /cdk:commit-changes';

  // Changelog parts first: a deliberate release above `required` needs a new matching section.
  const clFile = policy.changelog;
  const clAbs = inside(cwd, clFile);
  const headCl = d.existsSync(clAbs) ? d.readFileSync(clAbs, 'utf8') : null;
  const h = changelogParts(headCl ?? '');
  const b = changelogParts(headCl === null ? '' : (show(d, cwd, mb, clFile) ?? ''));
  const newRelease = (v) => h.releases.includes(fmt(v)) && !b.releases.includes(fmt(v));
  let accepted = null;

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
    if (c > 0 && newRelease(headVs[0])) {
      accepted = fmt(headVs[0]);
      notes.push(`release ${accepted} above required ${fmt(required)}`);
    } else if (c !== 0) {
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
  if (headCl === null) {
    failures.push(
      fail('changelog-missing', `${clFile} does not exist`, 'run /cdk:update-changelog, then /cdk:commit-changes')
    );
  } else {
    const dup = h.bullets.find((x, i) => h.bullets.indexOf(x) !== i);
    const released = (required && newRelease(required)) || accepted !== null;
    if (dup)
      failures.push(
        fail('changelog-duplicate', `duplicate Unreleased entry: "${dup.slice(0, 60)}"`, 'remove the duplicate line')
      );
    if (!released && !h.bullets.some((x) => !b.bullets.includes(x))) {
      failures.push(
        fail(
          'changelog-unchanged',
          `no new entry under Unreleased in ${clFile}`,
          'run /cdk:update-changelog, then /cdk:commit-changes'
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
      const branch = out(d.git(cwd, ['symbolic-ref', '--short', 'HEAD']));
      const remoteSha = out(d.git(cwd, ['ls-remote', '--heads', remote, branch], 30_000)).split(/\s/)[0];
      if (remoteSha !== out(d.git(cwd, ['rev-parse', 'HEAD']))) {
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
    accepted,
    base: baseV ? fmt(baseV) : null,
    target: tgt
  });
}

// Writes the accepted (deliberate) or required version into every version file; idempotent.
export function bump(cwd, { target, pendingSubject = '' } = {}, deps = {}) {
  const d = withDeps(deps);
  const r = evaluate(cwd, { target, ci: false, prePush: true, pendingSubject }, deps);
  if (r.skipped || !r.required) return { changed: [], ...r };
  const { root, policy } = loadPolicy(cwd, deps);
  const want = r.accepted ?? r.required;
  const changed = [];
  for (const v of policy.versionFiles) {
    const abs = inside(root, v.path);
    const text = d.readFileSync(abs, 'utf8');
    // eslint-disable-next-line security/detect-non-literal-regexp -- the key comes from the committed release policy
    const re = new RegExp(`("${v.key}"\\s*:\\s*")([^"]*)(")`);
    const m = re.exec(text);
    if (!m) throw new Error(`key "${v.key}" not found in ${v.path}`);
    if (m[2] !== want) {
      d.writeFileSync(abs, text.replace(re, `$1${want}$3`));
      changed.push({ path: v.path, from: m[2], to: want });
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

// PreToolUse hook body; resolves to the exit code (2 blocks). The dispatcher passes the event it already parsed.
export async function runHook(deps = {}, parsed) {
  const d = withDeps(deps);
  const event = parsed ?? (await d.readJsonStdin());
  const cwd = (typeof event.cwd === 'string' && event.cwd) || d.env.CLAUDE_PROJECT_DIR || d.cwd();
  let loaded;
  try {
    loaded = loadPolicy(cwd, deps);
  } catch (e) {
    d.stderr(`release-check: invalid ${POLICY_FILE}: ${e.message}\n`);
    return 2;
  }
  if (!loaded.policy) return 0;
  const target = createTarget(event, loaded.policy.defaultBranch);
  if (!target) return 0;

  const rel = [loaded.policy.changelog, ...loaded.policy.versionFiles.map((v) => v.path)];
  const head = out(d.git(loaded.root, ['rev-parse', 'HEAD']));
  const relStatus = out(d.git(loaded.root, ['status', '--porcelain=v1', '--', ...rel]));
  const key = sha(`${head}|${target}|${loaded.hash}|${relStatus}`);
  const file = d.statePath('release-check', loaded.root);
  if (d.readState(file).pass === key) return 0;

  const r = evaluate(cwd, { target }, deps);
  if (r.ok) {
    d.writeState(file, { pass: key });
    return 0;
  }
  d.stderr(
    `${report(r)}\nBlocked PR/MR creation. Fix, commit, push, then retry. No bypass: exceptions live in ${POLICY_FILE} (exempt, with a reason).\n`
  );
  return 2;
}

// CLI body; resolves to the exit code.
export async function main(argv = process.argv.slice(2), deps = {}) {
  const d = withDeps(deps);
  const [mode = 'check', ...args] = argv;
  const opt = (n) => args[args.indexOf(n) + 1];
  const cwd = d.cwd();
  if (mode === 'hook') return runHook(deps);
  const target = args.includes('--target') ? opt('--target') : undefined;
  try {
    const subjectFile = args.includes('--subject') ? opt('--subject') : undefined;
    if (args.includes('--subject') && (!subjectFile || subjectFile.startsWith('--'))) {
      d.error('release-check: --subject needs a file path');
      return 2;
    }
    const pendingSubject = subjectFile ? (d.readFileSync(subjectFile, 'utf8').split('\n')[0] ?? '') : '';
    if (mode === 'bump') {
      const r = bump(cwd, { target, pendingSubject }, deps);
      d.log(
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
    const r = evaluate(
      cwd,
      {
        target,
        ci: args.includes('--ci'),
        prePush: args.includes('--pre-push'),
        pendingSubject
      },
      deps
    );
    d.log(args.includes('--json') ? JSON.stringify(r) : report(r) || `ok: ${r.level} -> ${r.required}`);
    return r.ok ? 0 : 1;
  } catch (e) {
    d.error(`release-check: ${e.message}`);
    return 1;
  }
}

// `hook` is a gate (exit 2 on an unexpected error); the CLI modes exit 1.
await runIfMain(import.meta.url, main, { label: 'release-check', failCode: process.argv[2] === 'hook' ? 2 : 1 });
