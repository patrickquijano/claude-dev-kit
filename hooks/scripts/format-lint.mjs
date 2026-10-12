// PostToolUse hook: format and lint the file Claude just wrote or edited.
// Prints one JSON object; failures block with the tool output so Claude can fix them.
import { readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FILE, TABLE, available, isFile, keyOf, readStdin, run, win } from './tools.mjs';

const REAL_DEPS = {
  isFile,
  available,
  run,
  win,
  readFile: (f) => readFileSync(f, 'utf8'),
  realpath: realpathSync,
  writeFile: writeFileSync,
  rename: renameSync,
  env: process.env,
  cwd: () => process.cwd(),
  pid: process.pid
};

// Returns the hook result object, or null when there is nothing to report. `deps` overrides side effects.
export function formatLint(input, deps = {}) {
  const d = { ...REAL_DEPS, ...deps };
  const file = input?.tool_input?.file_path;
  if (typeof file !== 'string' || !d.isFile(file) || (d.win && file.includes('"'))) return null;
  let projectDir, abs;
  try {
    projectDir = d.realpath(d.env.CLAUDE_PROJECT_DIR || input.cwd || d.cwd());
    abs = d.realpath(file);
  } catch {
    return null;
  }
  const rel = path.relative(projectDir, abs);
  const segments = rel.split(/[\\/]/);
  if (!rel || path.isAbsolute(rel) || segments[0] === '..') return null;
  if (segments.some((s) => s === 'node_modules' || s === '.git')) return null;

  const key = keyOf(abs);
  const target = rel.split(path.sep).join('/');
  const lines = [];
  const failures = [];
  for (const entry of TABLE[key] || []) {
    const step = entry.alt ? entry.alt.find((c) => d.available(c, projectDir)) : entry;
    if (!step || !d.available(step, projectDir)) continue;
    if (step.skip?.(d.readFile(abs))) continue;
    const args = step.args.includes(FILE) ? step.args.map((a) => (a === FILE ? target : a)) : [...step.args, target];
    const [cmd, argv] = step.npx ? ['npx', ['--yes', step.cmd, ...args]] : [step.cmd, args];
    const r = d.run(cmd, argv, projectDir);
    const ok = !r.error && r.status === 0;
    if (ok && step.stdout) {
      const tmp = `${abs}.${d.pid}.tmp`;
      d.writeFile(tmp, r.stdout);
      d.rename(tmp, abs);
    }
    lines.push(`${ok ? '✅' : '❌'} ${entry.kind}: ${target}`);
    if (!ok) {
      const out = [step.stdout ? '' : r.stdout, r.stderr, r.error?.message].filter(Boolean).join('\n').trim();
      failures.push(`$ ${[cmd, ...argv].join(' ')}\n${out}`);
    }
  }
  if (!lines.length) return null;
  const result = { systemMessage: lines.join(' | ') };
  if (failures.length) {
    result.decision = 'block';
    result.reason = `Format/lint issues in ${target}; fix these issues:\n${failures.join('\n\n')}`.slice(0, 8000);
  }
  return result;
}

async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    return;
  }
  const result = formatLint(input);
  if (result) process.stdout.write(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
