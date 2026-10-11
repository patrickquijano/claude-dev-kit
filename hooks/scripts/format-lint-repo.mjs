// Stop hook: format and lint the whole repository with the tools in tools.mjs, one group of file types at a time.
// A group runs only when its files or tool configs changed since its last run; remaining issues block Claude.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FILE, available, groups, isFile, keyOf, readStdin, run } from './tools.mjs';

const MAX = 8000;
// Total budget in ms; below the hook `timeout` (600 s) so this script reports the timeout itself.
const BUDGET = 540_000;
// Chunk file arguments so one command line stays under the Windows cmd.exe limit (8191 characters).
const CHUNK = 7000;
const deadline = Date.now() + BUDGET;

function git(cwd, ...args) {
  return spawnSync('git', args, { cwd, maxBuffer: 1 << 30, windowsHide: true });
}

const list = (res) => res.stdout.toString().split('\0').filter(Boolean);

// Pathspecs for a group's files; `configs` adds each step's config files so a config edit re-runs the group.
function pathspecs(exts, steps) {
  const files = exts.flatMap((e) =>
    e === 'dockerfile' ? [':(glob)**/Dockerfile', ':(glob)**/Dockerfile.*'] : [`:(glob,icase)**/*.${e}`]
  );
  const configs = steps.flatMap((s) => [s, ...(s.alt ?? [])]).flatMap((s) => s.configs ?? []);
  return { files, all: [...files, ...[...new Set(configs)].map((f) => `:(literal)${f}`)] };
}

// Hash of uncommitted changes plus untracked files under the pathspecs; '' when none, null when git fails.
function fingerprint(cwd, specs) {
  const diff = git(cwd, 'diff', 'HEAD', '--binary', '--', ...specs);
  const untracked = git(cwd, 'ls-files', '-o', '--exclude-standard', '-z', '--', ...specs);
  if (diff.error || diff.status !== 0 || untracked.status !== 0) return null;
  const files = list(untracked);
  if (!diff.stdout.length && !files.length) return '';
  const hash = createHash('sha256').update(diff.stdout);
  for (const file of files.sort()) {
    hash.update(`\0${file}\0`);
    try {
      hash.update(readFileSync(path.join(cwd, file)));
    } catch {
      // Removed since listing; the name still counts.
    }
  }
  return hash.digest('hex');
}

// Tracked and untracked (not ignored) files of the group that exist on disk, outside node_modules and .git.
function groupFiles(cwd, exts, specs) {
  const res = git(cwd, 'ls-files', '-co', '--exclude-standard', '-z', '--', ...specs);
  if (res.error || res.status !== 0) return [];
  const files = list(res).filter((f) => {
    const segments = f.split('/');
    return !segments.some((s) => s === 'node_modules' || s === '.git') && exts.includes(keyOf(f));
  });
  return [...new Set(files)].filter((f) => isFile(path.join(cwd, f))).sort();
}

function chunks(files) {
  const out = [];
  let cur = [];
  let len = 0;
  for (const f of files) {
    if (cur.length && len + f.length + 3 > CHUNK) {
      out.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(f);
    len += f.length + 3;
  }
  if (cur.length) out.push(cur);
  return out;
}

// Runs one step over the files; per-file for steps that name the file in args or write it from stdout.
function runStep(step, files, cwd, failures) {
  const perFile = step.stdout || step.args.includes(FILE);
  let ok = true;
  for (const batch of perFile ? files.map((f) => [f]) : chunks(files)) {
    const left = deadline - Date.now();
    if (left <= 0) {
      failures.push(`$ ${step.cmd}\nTimed out after ${BUDGET / 1000}s total; not run on ${batch.length} files.`);
      return false;
    }
    const base = [...step.args, ...(step.strict ?? [])];
    const args = base.includes(FILE) ? base.map((a) => (a === FILE ? batch[0] : a)) : [...base, ...batch];
    const [cmd, argv] = step.npx ? ['npx', ['--yes', step.cmd, ...args]] : [step.cmd, args];
    const r = run(cmd, argv, cwd, Math.min(300_000, left));
    const good = !r.error && r.status === 0;
    if (good && step.stdout) {
      const abs = path.join(cwd, batch[0]);
      const tmp = `${abs}.${process.pid}.tmp`;
      writeFileSync(tmp, r.stdout);
      renameSync(tmp, abs);
    }
    if (!good) {
      ok = false;
      const out = [step.stdout ? '' : r.stdout, r.stderr, r.error?.message].filter(Boolean).join('\n').trim();
      failures.push(`$ ${[cmd, ...argv].join(' ')}\n${out}`);
    }
  }
  return ok;
}

async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    return;
  }
  let cwd;
  try {
    cwd = realpathSync(process.env.CLAUDE_PROJECT_DIR || input?.cwd || process.cwd());
  } catch {
    return;
  }
  const state = path.join(
    tmpdir(),
    `cdk-format-lint-${createHash('sha256').update(cwd).digest('hex').slice(0, 16)}.json`
  );
  let last = {};
  try {
    last = JSON.parse(readFileSync(state, 'utf8')) ?? {};
  } catch {
    // First run.
  }
  // Skip unchanged groups: Q&A turns cost nothing and Claude can stop once it stops editing.
  const stale = [];
  for (const [exts, steps] of groups) {
    const specs = pathspecs(exts, steps);
    const fp = fingerprint(cwd, specs.all);
    // Outside git or before the first commit there is nothing to compare, so the hook does nothing.
    if (fp === null) return;
    if (fp === last[exts[0]] || (last[exts[0]] === undefined && fp === '')) continue;
    stale.push({ exts, steps, specs });
  }
  if (!stale.length) return;

  const lines = [];
  const failures = [];
  for (const { exts, steps, specs } of stale) {
    const files = groupFiles(cwd, exts, specs.files);
    for (const entry of steps) {
      const step = entry.alt ? entry.alt.find((c) => available(c, cwd)) : entry;
      if (!files.length || !step || !available(step, cwd)) continue;
      const targets = step.skip ? files.filter((f) => !step.skip(readFileSync(path.join(cwd, f), 'utf8'))) : files;
      if (!targets.length) continue;
      const ok = runStep(step, targets, cwd, failures);
      lines.push(`${ok ? '✅' : '❌'} ${entry.kind} ${step.cmd}: ${targets.length} .${exts[0]} files`);
    }
  }
  // Recorded after the run, so the hook's own fixes do not trigger a rerun; failures re-run once Claude edits.
  for (const { exts, specs } of stale) last[exts[0]] = fingerprint(cwd, specs.all) ?? '';
  try {
    writeFileSync(state, JSON.stringify(last));
  } catch {
    // Unwritable temp dir; the next turn runs again.
  }
  if (!lines.length) return;
  const result = { systemMessage: lines.join(' | ') };
  if (failures.length) {
    result.decision = 'block';
    result.reason =
      `Repository format/lint issues; fix every error and warning, then finish (this hook re-runs on changed file types):\n${failures.join('\n\n')}`.slice(
        0,
        MAX
      );
  }
  process.stdout.write(JSON.stringify(result));
}

await main();
