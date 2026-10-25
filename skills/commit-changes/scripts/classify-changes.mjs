// Classifies uncommitted changes as a small or an analyzed commit path from counts, path patterns, and a secret-pattern scan, never from diff meaning.
// CLI: `[--hints] [--paths <file>...]`, run in the repo root; JSON on stdout, exit 0. Reads git status and diffs only.
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
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

const MAX_FILES = 5;
const MAX_LINES = 150;
const HEAVY_PATH =
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|\.gitlab-ci\.yml|Dockerfile[^/]*|docker-compose[^/]*)$|\.lock$|(^|\/)(\.github|migrations)\/|\.tf$/;
const SECRET_NAME = /(^|\/)(\.env[^/]*|id_(rsa|dsa|ecdsa|ed25519)|[^/]*\.(pem|key|p12|pfx))$/;
const SECRET_TEXT = /-----BEGIN|AKIA|ghp_|github_pat_|gh[ousr]_|glpat-|xox[bp]-|sk-ant-|sk-proj-|AIza/;

// Parses `git status --porcelain=v1 -z` into entries; a rename or copy carries its origin path as the next record.
export function parseStatus(text) {
  const parts = text.split('\0').filter(Boolean);
  const entries = [];
  for (let i = 0; i < parts.length; i++) {
    const [x, y] = parts[i];
    const entry = { x, y, path: parts[i].slice(3) };
    if (x === 'R' || x === 'C' || y === 'R' || y === 'C') i++;
    entries.push(entry);
  }
  return entries;
}

// Parses `git diff --numstat` lines; a binary file has `-` counts.
export function parseNumstat(text) {
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [a, d, ...rest] = line.split('\t');
      const binary = a === '-' && d === '-';
      return { added: binary ? 0 : Number(a), deleted: binary ? 0 : Number(d), binary, path: rest.join('\t') };
    });
}

// True when the file name or the added text matches a secret pattern.
export const isSecret = (name, text = '') => SECRET_NAME.test(name) || SECRET_TEXT.test(text);

// `entries` from parseStatus, `stats` from parseNumstat (tracked plus untracked), `secrets` the flagged paths.
export function classify({ entries, stats, hints = false, secrets = [] }) {
  const reasons = [];
  const lines = stats.reduce((n, s) => n + s.added + s.deleted, 0);
  if (entries.length > MAX_FILES) reasons.push('more-than-5-files');
  if (lines > MAX_LINES) reasons.push('more-than-150-lines');
  if (stats.some((s) => s.binary)) reasons.push('binary');
  if (entries.some((e) => /[DRC]/.test(e.x + e.y))) reasons.push('delete-or-rename');
  if (entries.some((e) => HEAVY_PATH.test(e.path))) reasons.push('lockfile-ci-migration-or-infra-path');
  if (new Set(entries.map((e) => (e.path.includes('/') ? e.path.split('/')[0] : '.'))).size > 1)
    reasons.push('several-top-level-dirs');
  if (hints) reasons.push('grouping-hints');
  if (secrets.length) reasons.push('secret-pattern');
  return { path: reasons.length ? 'analyzed' : 'small', reasons, files: entries.length, lines, secrets };
}

function paths(argv) {
  const i = argv.indexOf('--paths');
  return i < 0 ? [] : argv.slice(i + 1).filter((a) => !a.startsWith('--'));
}

// Real side effects; tests pass stubs. `git` returns stdout and throws when git cannot run or exits above 1 (a `--no-index` diff exits 1 when files differ).
const realDeps = {
  git(args) {
    const r = spawnSync('git', args, { encoding: 'utf8', timeout: 20000, maxBuffer: 64 * 1024 * 1024 });
    if (r.error || r.status > 1) throw new Error(`git ${args[0]} failed`);
    return r.stdout;
  },
  readFile: (file) => readFileSync(file, 'utf8'),
  log: (text) => console.log(text)
};

// CLI body; returns the exit code. Any read failure or doubt → the analyzed path.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const scope = paths(argv).length ? ['--', ...paths(argv)] : [];
  const hints = argv.includes('--hints');
  let res;
  try {
    const entries = parseStatus(d.git(['status', '--porcelain=v1', '-z', '-uall', ...scope]));
    const stats = parseNumstat(d.git(['diff', 'HEAD', '--numstat', ...scope]));
    const untracked = entries.filter((e) => e.x === '?');
    for (const u of untracked)
      stats.push(...parseNumstat(d.git(['diff', '--no-index', '--numstat', '--', '/dev/null', u.path])));
    const small = classify({ entries, stats, hints });
    // Only a small candidate reads diff and file content for secrets.
    const secrets = entries.filter((e) => isSecret(e.path)).map((e) => e.path);
    if (small.path === 'small') {
      if (isSecret('', d.git(['diff', 'HEAD', ...scope]))) secrets.push('<tracked diff>');
      for (const u of untracked) if (isSecret('', d.readFile(u.path))) secrets.push(u.path);
    }
    res = classify({ entries, stats, hints, secrets });
  } catch (err) {
    res = { path: 'analyzed', reasons: ['read-failed'], error: String(err.message).slice(0, 200) };
  }
  d.log(JSON.stringify(res));
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'classify-changes');
