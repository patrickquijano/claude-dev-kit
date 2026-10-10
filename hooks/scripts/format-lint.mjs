// PostToolUse hook: format and lint the file Claude just wrote or edited.
// Prints one JSON object; failures block with the tool output so Claude can fix them.
import { readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { FILE, TABLE, available, isFile, keyOf, readStdin, run, win } from './tools.mjs';

async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    return;
  }
  const file = input?.tool_input?.file_path;
  if (typeof file !== 'string' || !isFile(file) || (win && file.includes('"'))) return;
  let projectDir, abs;
  try {
    projectDir = realpathSync(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
    abs = realpathSync(file);
  } catch {
    return;
  }
  const rel = path.relative(projectDir, abs);
  const segments = rel.split(/[\\/]/);
  if (!rel || path.isAbsolute(rel) || segments[0] === '..') return;
  if (segments.some((s) => s === 'node_modules' || s === '.git')) return;

  const key = keyOf(abs);
  const target = rel.split(path.sep).join('/');
  const lines = [];
  const failures = [];
  for (const entry of TABLE[key] || []) {
    const step = entry.alt ? entry.alt.find((c) => available(c, projectDir)) : entry;
    if (!step || !available(step, projectDir)) continue;
    if (step.skip?.(readFileSync(abs, 'utf8'))) continue;
    const args = step.args.includes(FILE) ? step.args.map((a) => (a === FILE ? target : a)) : [...step.args, target];
    const [cmd, argv] = step.npx ? ['npx', ['--yes', step.cmd, ...args]] : [step.cmd, args];
    const r = run(cmd, argv, projectDir);
    const ok = !r.error && r.status === 0;
    if (ok && step.stdout) {
      const tmp = `${abs}.${process.pid}.tmp`;
      writeFileSync(tmp, r.stdout);
      renameSync(tmp, abs);
    }
    lines.push(`${ok ? '✅' : '❌'} ${entry.kind}: ${target}`);
    if (!ok) {
      const out = [step.stdout ? '' : r.stdout, r.stderr, r.error?.message].filter(Boolean).join('\n').trim();
      failures.push(`$ ${[cmd, ...argv].join(' ')}\n${out}`);
    }
  }
  if (!lines.length) return;
  const result = { systemMessage: lines.join(' | ') };
  if (failures.length) {
    result.decision = 'block';
    result.reason = `Format/lint issues in ${target}; fix these issues:\n${failures.join('\n\n')}`.slice(0, 8000);
  }
  process.stdout.write(JSON.stringify(result));
}

await main();
