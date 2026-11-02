// Deterministic diff manifest for review-code-changes: scope, snapshot, delta, and verify over local git changes.
// CLI: `scope --root <dir> [--scratch <dir>]`, `snapshot --root <dir> --scratch <dir> --paths <file>`,
// `delta --root <dir> --scratch <dir> --paths <file> --round <n>`, `verify --root <dir> --scratch <dir> --paths <file>`.
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, parse, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Runs `fn` only when this module is the entry script; an error it throws prints one stderr line and sets exit code 1.
async function runIfMain(metaUrl, fn, label) {
  if (!process.argv[1] || metaUrl !== pathToFileURL(realpathSync(process.argv[1])).href) return;
  try {
    const code = await fn();
    if (typeof code === 'number') process.exitCode = code;
  } catch (err) {
    process.stderr.write(
      `${label}: ${String(err?.message ?? err)
        .split('\n')[0]
        .slice(0, 300)}\n`
    );
    process.exitCode = 1;
  }
}

const GIT_TIMEOUT_MS = 60_000;
const MAX_BUFFER = 256 * 1024 * 1024;
const MAX_FILE_BYTES = 1_000_000;
export const BATCH_FILES = 60;
export const BATCH_LINES = 3000;
const SAFE_PATH = /^[A-Za-z0-9._/@+-]+$/;
const DIFF_FLAGS = [
  '--no-color',
  '--no-ext-diff',
  '--diff-algorithm=histogram',
  '-U3',
  '--src-prefix=a/',
  '--dst-prefix=b/'
];

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const byteSort = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// A path safe as a git argument and scratch path: allowed characters, no `..` segment, no leading `/` or `-`.
export function isSafePath(path) {
  return (
    typeof path === 'string' &&
    SAFE_PATH.test(path) &&
    !path.startsWith('/') &&
    !path.startsWith('-') &&
    !path.split('/').includes('..')
  );
}

// A secret-shaped file name (`.env*`, key, cert, keystore, and `.tfvars` files, `id_<algo>` keys, `credentials*`, `secrets.*`, and dotfiles such as `.netrc` or `.git-credentials`) never reaches scratch or `diff.patch`.
function isSensitive(path) {
  const name = path.split('/').pop();
  return (
    /^\.env/i.test(name) ||
    /\.(pem|key|p12|pfx|jks|keystore|tfvars)$/i.test(name) ||
    /^id_(rsa|dsa|ecdsa|ed25519)/i.test(name) ||
    /^credentials/i.test(name) ||
    /^secrets\./i.test(name) ||
    /^\.(netrc|npmrc|pgpass|pypirc|git-credentials)$/i.test(name)
  );
}

// Parses unified diff text into files with their new-side hunks; binary, deleted, and unsafe paths carry a `skip` reason.
export function parseDiff(text) {
  const files = [];
  const sections = text.split(/^(?=diff --git )/m).filter((s) => s.startsWith('diff --git '));
  for (const section of sections) {
    const lines = section.split('\n');
    if (lines.at(-1) === '') lines.pop();
    const header = /^diff --git a\/(.+) b\/(.+)$/.exec(lines[0]);
    const plus = /^\+\+\+ (?:b\/)?(.+?)\t?$/m.exec(section);
    const minus = /^--- (?:a\/)?(.+?)\t?$/m.exec(section);
    const renamed = /^rename to (.+)$/m.exec(section);
    const binary = /^Binary files (?:\/dev\/null|a\/(.+?)) and (?:\/dev\/null|b\/(.+?)) differ$/m.exec(section);
    const deleted = /^deleted file mode /m.test(section);
    const path = binary
      ? (binary[2] ?? binary[1])
      : deleted
        ? (minus?.[1] ?? header?.[1])
        : ((plus && plus[1] !== '/dev/null' ? plus[1] : null) ?? renamed?.[1] ?? header?.[2]);
    if (!path) throw new Error(`cannot read the path of a diff section: ${lines[0].slice(0, 80)}`);
    const hunks = [];
    for (const line of lines) {
      const m = /^@@ -[\d,]+ \+(\d+),?(\d*) @@/.exec(line);
      if (m) hunks.push({ id: `${path}:${m[1]}`, newStart: Number(m[1]), newLines: m[2] === '' ? 1 : Number(m[2]) });
    }
    let skip = null;
    if (binary) skip = 'binary';
    else if (deleted) skip = 'deleted';
    else if (!isSafePath(path)) skip = 'unsafe path';
    files.push({ path, hunks, lines: lines.length, skip });
  }
  return files;
}

// Splits sorted paths into batches of at most 60 files or 3,000 diff lines; one file over 3,000 lines forms its own batch.
export function makeBatches(files) {
  const batches = [];
  let current = [];
  let lines = 0;
  for (const f of files) {
    if (current.length && (current.length >= BATCH_FILES || lines + f.lines > BATCH_LINES)) {
      batches.push(current);
      current = [];
      lines = 0;
    }
    current.push(f);
    lines += f.lines;
  }
  if (current.length) batches.push(current);
  return batches.map((b) => b.map((f) => f.path));
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
}

// Side effects the CLI needs; tests pass stubs, everything else uses the real ones.
const realDeps = {
  spawnSync,
  copyFileSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
  makeScratch: () => mkdtempSync(join(tmpdir(), 'review-code-')),
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

function makeGit(d, root) {
  return (args, { okStatuses = [0], input } = {}) => {
    const r = d.spawnSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      input
    });
    if (r.error) throw new Error(`git ${args[0]} failed: ${r.error.message}`);
    if (!okStatuses.includes(r.status)) {
      throw new Error(`git ${args[0]} exited ${r.status}: ${String(r.stderr ?? '').split('\n')[0]}`);
    }
    return r;
  };
}

// The default branch ref (`origin/HEAD`, else `main` or `master`), or null when none exists.
function defaultRef(git) {
  const sym = git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], { okStatuses: [0, 128] });
  if (sym.status === 0 && sym.stdout.trim()) return sym.stdout.trim();
  for (const name of ['main', 'master']) {
    const r = git(['rev-parse', '--verify', '--quiet', `refs/heads/${name}`], { okStatuses: [0, 1] });
    if (r.status === 0) return name;
  }
  return null;
}

// Base commit: HEAD on the default branch, else the merge base of HEAD and the default branch.
export function resolveBase(git) {
  const head = git(['rev-parse', 'HEAD']).stdout.trim();
  const ref = defaultRef(git);
  const current = git(['branch', '--show-current']).stdout.trim();
  if (!ref || current === ref.replace(/^origin\//, '')) return { head, base: head, defaultBranch: ref };
  const mb = git(['merge-base', 'HEAD', ref], { okStatuses: [0, 1] });
  if (mb.status !== 0) throw new Error(`no merge base between HEAD and ${ref}`);
  return { head, base: mb.stdout.trim(), defaultBranch: ref };
}

function inside(root, path) {
  const abs = resolve(root, path);
  return abs === root || abs.startsWith(root + sep) ? abs : null;
}

// True when the real path of `src` (symlinks resolved) stays under the real root.
function realInside(d, root, src) {
  return d.realpathSync(src).startsWith(d.realpathSync(root) + sep);
}

// Copies each non-skipped file from the working tree into `<dir>/<path>`; a symlink or oversized file becomes skipped.
function copyFiles(d, root, dir, files) {
  for (const f of files) {
    if (f.skip) continue;
    if (isSensitive(f.path)) {
      f.skip = 'sensitive';
      continue;
    }
    const src = inside(root, f.path);
    if (!src) {
      f.skip = 'outside root';
      continue;
    }
    let st;
    try {
      st = d.lstatSync(src);
    } catch (err) {
      if (err?.code !== 'ENOENT') throw err;
      f.skip = 'deleted';
      continue;
    }
    if (!st.isFile()) f.skip = 'not a regular file';
    else if (st.size > MAX_FILE_BYTES) f.skip = 'oversized';
    else if (!realInside(d, root, src)) f.skip = 'outside root';
    else {
      const dest = join(dir, f.path);
      d.mkdirSync(dirname(dest), { recursive: true });
      d.copyFileSync(src, dest);
    }
  }
}

function writeBatches(d, scratch, prefix, files) {
  const batches = makeBatches(files);
  batches.forEach((paths, i) => d.writeFileSync(join(scratch, `${prefix}${i + 1}.txt`), `${paths.join('\n')}\n`));
  return batches;
}

// Throws when the scratch path is the root, a filesystem root, or an ancestor of the root, since the commands remove files under it.
export function assertScratch(root, scratch) {
  if (scratch === root || scratch === parse(scratch).root || root.startsWith(scratch + sep))
    throw new Error(`unsafe --scratch: ${scratch} is the root, a filesystem root, or contains the root`);
}

function resetScratch(d, scratch, names) {
  for (const n of names) d.rmSync(join(scratch, n), { recursive: true, force: true });
}

// Removes the scratch files whose names pass the `matches` predicate.
function removeMatching(d, scratch, matches) {
  for (const n of d.readdirSync(scratch)) if (matches(n)) d.rmSync(join(scratch, n), { force: true });
}

// Removes the files a previous scope run left in a reused scratch directory, delta files included.
function clearPrevious(d, scratch) {
  let previous = {};
  try {
    previous = JSON.parse(d.readFileSync(join(scratch, 'manifest.json'), 'utf8'));
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
  }
  (previous.batches ?? []).forEach((_, i) => d.rmSync(join(scratch, `batch-${i + 1}.txt`), { force: true }));
  removeMatching(d, scratch, (n) => /^delta-\d+/.test(n));
  resetScratch(d, scratch, ['head', 'snap', 'snap.json', 'diff.patch', 'manifest.json']);
}

function readPaths(d, file) {
  return d
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)
    .sort(byteSort);
}

function requireArgs(argv, names) {
  const values = names.map((n) => arg(argv, n));
  if (values.some((v) => !v)) return null;
  return values;
}

// The skip reason for an untracked file that is not a small regular file, or null; a missing file is left to git.
function untrackedSkip(d, root, path) {
  try {
    const st = d.lstatSync(join(root, path));
    if (!st.isFile()) return 'not a regular file';
    return st.size > MAX_FILE_BYTES ? 'oversized' : null;
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
    return null;
  }
}

// scope: the round-1 manifest of everything since the base plus staged, unstaged, and untracked files.
export function scope(argv, d) {
  const rootArg = arg(argv, '--root');
  if (!rootArg) throw new Error('usage: scope --root <dir> [--scratch <dir>]');
  const root = resolve(rootArg);
  const git = makeGit(d, root);
  const { head, base, defaultBranch } = resolveBase(git);
  const scratchArg = arg(argv, '--scratch');
  const scratch = resolve(scratchArg ?? d.makeScratch());
  if (scratchArg) assertScratch(root, scratch);
  d.mkdirSync(scratch, { recursive: true });
  clearPrevious(d, scratch);
  let patch = git(['-c', 'core.quotepath=off', 'diff', ...DIFF_FLAGS, '--find-renames', base]).stdout;
  const untracked = git(['ls-files', '--others', '--exclude-standard', '-z'])
    .stdout.split('\0')
    .filter(Boolean)
    .sort(byteSort);
  const excluded = [];
  for (const f of untracked) {
    if (f.endsWith('/')) {
      excluded.push({ path: f, reason: 'directory' });
      continue;
    }
    if (!isSafePath(f)) {
      excluded.push({ path: JSON.stringify(f), reason: 'unsafe path' });
      continue;
    }
    if (isSensitive(f)) {
      excluded.push({ path: f, reason: 'sensitive' });
      continue;
    }
    const big = untrackedSkip(d, root, f);
    if (big) {
      excluded.push({ path: f, reason: big });
      continue;
    }
    patch += git(['-c', 'core.quotepath=off', 'diff', ...DIFF_FLAGS, '--no-index', '/dev/null', f], {
      okStatuses: [0, 1]
    }).stdout;
  }
  const kept = [];
  const parsed = [];
  for (const section of patch.split(/^(?=diff --git )/m).filter((s) => s.startsWith('diff --git '))) {
    const header = section.split('\n')[0];
    if (header.startsWith('diff --git "')) {
      excluded.push({ path: header.slice('diff --git '.length), reason: 'unsafe path' });
      continue;
    }
    const [file] = parseDiff(section);
    const sides = /^diff --git a\/(.+) b\/(.+)$/.exec(header) ?? [];
    if (isSensitive(file.path) || isSensitive(sides[1] ?? file.path) || isSensitive(sides[2] ?? file.path))
      excluded.push({ path: file.path, reason: 'sensitive' });
    else {
      kept.push(section);
      parsed.push(file);
    }
  }
  patch = kept.join('');
  parsed.sort((a, b) => byteSort(a.path, b.path));
  copyFiles(d, root, join(scratch, 'head'), parsed);
  const files = parsed.filter((f) => !f.skip);
  const skipped = [...excluded, ...parsed.filter((f) => f.skip).map((f) => ({ path: f.path, reason: f.skip }))].sort(
    (a, b) => byteSort(a.path, b.path)
  );
  const batches = writeBatches(d, scratch, 'batch-', files);
  d.writeFileSync(join(scratch, 'diff.patch'), patch);
  const out = {
    root,
    head,
    base,
    defaultBranch,
    scratch,
    sha256: sha256(patch),
    files: files.map((f) => ({ path: f.path, hunks: f.hunks })),
    batches,
    skipped
  };
  d.writeFileSync(join(scratch, 'manifest.json'), `${JSON.stringify(out, null, 2)}\n`);
  return out;
}

// snapshot: copies the planned files into `<scratch>/snap` before a fix; a missing file is recorded as absent.
export function snapshot(argv, d) {
  const [rootArg, scratchArg, pathsFile] = requireArgs(argv, ['--root', '--scratch', '--paths']) ?? [];
  if (!rootArg) throw new Error('usage: snapshot --root <dir> --scratch <dir> --paths <file>');
  const root = resolve(rootArg);
  const scratch = resolve(scratchArg);
  assertScratch(root, scratch);
  const paths = readPaths(d, pathsFile);
  const files = paths.map((path) => ({
    path,
    skip: !isSafePath(path) ? 'unsafe path' : isSensitive(path) ? 'sensitive' : null
  }));
  resetScratch(d, scratch, ['snap']);
  copyFiles(d, root, join(scratch, 'snap'), files);
  const out = {
    snapshot: files.filter((f) => !f.skip).map((f) => f.path),
    absent: files.filter((f) => f.skip === 'deleted').map((f) => f.path)
  };
  d.writeFileSync(join(scratch, 'snap.json'), `${JSON.stringify(out)}\n`);
  return {
    snapshot: out.snapshot,
    skipped: files.filter((f) => f.skip).map((f) => ({ path: f.path, reason: f.skip }))
  };
}

// delta: diffs the snapshot against the working tree, refreshes `head/`, and writes the delta hunks for round `n`.
export function delta(argv, d) {
  const [rootArg, scratchArg, pathsFile, round] =
    requireArgs(argv, ['--root', '--scratch', '--paths', '--round']) ?? [];
  if (!rootArg || !/^\d+$/.test(round))
    throw new Error('usage: delta --root <dir> --scratch <dir> --paths <file> --round <n>');
  const root = resolve(rootArg);
  const scratch = resolve(scratchArg);
  assertScratch(root, scratch);
  const git = makeGit(d, root);
  const paths = readPaths(d, pathsFile);
  let absent = [];
  try {
    absent = JSON.parse(d.readFileSync(join(scratch, 'snap.json'), 'utf8')).absent ?? [];
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
  }
  const exists = (path) => {
    try {
      d.lstatSync(path);
      return true;
    } catch (err) {
      if (err?.code !== 'ENOENT') throw err;
      return false;
    }
  };
  let patch = '';
  const parsed = [];
  const excluded = [];
  for (const p of paths) {
    if (!isSafePath(p)) {
      excluded.push({ path: p, reason: 'unsafe path' });
      continue;
    }
    if (isSensitive(p)) {
      excluded.push({ path: p, reason: 'sensitive' });
      continue;
    }
    const before = join(scratch, 'snap', p);
    const hadBefore = exists(before);
    const hasAfter = exists(join(root, p));
    if (!hadBefore && !hasAfter) {
      excluded.push({ path: p, reason: 'absent' });
      continue;
    }
    let contained = true;
    if (hasAfter) {
      try {
        contained = realInside(d, root, join(root, p));
      } catch (err) {
        if (err?.code !== 'ENOENT') throw err;
        excluded.push({ path: p, reason: 'not a regular file' });
        continue;
      }
    }
    if (!contained) {
      excluded.push({ path: p, reason: 'outside root' });
      continue;
    }
    if (hasAfter && !d.lstatSync(join(root, p)).isFile()) {
      excluded.push({ path: p, reason: 'not a regular file' });
      continue;
    }
    if (!hadBefore && !absent.includes(p)) {
      excluded.push({ path: p, reason: 'not snapshotted' });
      continue;
    }
    const text = git(
      [
        '-c',
        'core.quotepath=off',
        'diff',
        ...DIFF_FLAGS,
        '--no-index',
        hadBefore ? before : '/dev/null',
        hasAfter ? p : '/dev/null'
      ],
      { okStatuses: [0, 1] }
    ).stdout;
    patch += text;
    if (hasAfter) parsed.push(...parseDiff(text));
    else excluded.push({ path: p, reason: 'deleted' });
  }
  parsed.sort((a, b) => byteSort(a.path, b.path));
  copyFiles(d, root, join(scratch, 'head'), parsed);
  const files = parsed.filter((f) => !f.skip);
  removeMatching(d, scratch, (n) => n.startsWith(`delta-${round}-batch-`));
  const batches = writeBatches(d, scratch, `delta-${round}-batch-`, files);
  d.writeFileSync(join(scratch, `delta-${round}.patch`), patch);
  const out = {
    round: Number(round),
    sha256: sha256(patch),
    files: files.map((f) => ({ path: f.path, hunks: f.hunks })),
    batches,
    skipped: [...excluded, ...parsed.filter((f) => f.skip).map((f) => ({ path: f.path, reason: f.skip }))].sort(
      (a, b) => byteSort(a.path, b.path)
    )
  };
  d.writeFileSync(join(scratch, `delta-${round}.json`), `${JSON.stringify(out, null, 2)}\n`);
  return out;
}

// verify: the edit-scope safety check; HEAD must equal round 1 and each reviewed path must still match its `head/` copy.
export function verify(argv, d) {
  const [rootArg, scratchArg, pathsFile] = requireArgs(argv, ['--root', '--scratch', '--paths']) ?? [];
  if (!rootArg) throw new Error('usage: verify --root <dir> --scratch <dir> --paths <file>');
  const root = resolve(rootArg);
  const scratch = resolve(scratchArg);
  assertScratch(root, scratch);
  const git = makeGit(d, root);
  const manifest = JSON.parse(d.readFileSync(join(scratch, 'manifest.json'), 'utf8'));
  const head = git(['rev-parse', 'HEAD']).stdout.trim();
  const reviewed = new Set(manifest.files.map((f) => f.path));
  const drifted = [];
  for (const p of readPaths(d, pathsFile)) {
    if (!isSafePath(p)) {
      drifted.push({ path: p, reason: 'unsafe path' });
      continue;
    }
    const headCopy = join(scratch, 'head', p);
    let before = null;
    try {
      before = d.readFileSync(headCopy);
    } catch (err) {
      if (err?.code !== 'ENOENT') throw err;
    }
    if (before === null && !reviewed.has(p)) continue;
    const src = inside(root, p);
    let now;
    try {
      if (!src || !realInside(d, root, src)) {
        drifted.push({ path: p, reason: 'outside root' });
        continue;
      }
      now = sha256(d.readFileSync(src));
    } catch (err) {
      if (err?.code !== 'ENOENT') throw err;
      drifted.push({ path: p, reason: 'deleted' });
      continue;
    }
    if (before === null) drifted.push({ path: p, reason: 'review copy missing' });
    else if (now !== sha256(before)) drifted.push({ path: p, reason: 'changed since review' });
  }
  const headMoved = head !== manifest.head;
  return { ok: !headMoved && drifted.length === 0, head, headMoved, drifted };
}

const COMMANDS = { scope, snapshot, delta, verify };

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const run = COMMANDS[argv[0]];
  if (!run) {
    d.error('usage: diff-manifest.mjs scope|snapshot|delta|verify --root <dir> [options]');
    return 2;
  }
  d.log(JSON.stringify({ ok: true, ...run(argv.slice(1), d) }));
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'diff-manifest');
