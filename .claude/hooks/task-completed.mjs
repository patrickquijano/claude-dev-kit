// TaskCompleted hook: run the project's format and lint scripts before a task can complete.
// On failure, prints the output to stderr and exits 2 so Claude fixes the issues.
import { spawnSync } from 'node:child_process';

const win = process.platform === 'win32';
const MAX = 8000;

// Drains stdin (event JSON is unused) so the writer never blocks.
async function readStdin() {
  for await (const chunk of process.stdin) void chunk;
}

function npm(script, cwd) {
  const opts = { cwd, encoding: 'utf8', timeout: 240_000, env: { ...process.env, NO_COLOR: '1' } };
  // npm is a .cmd shim on Windows, which needs a shell; args are fixed literals.
  return spawnSync('npm', ['run', script], win ? { ...opts, shell: true } : opts);
}

async function main() {
  await readStdin();
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  for (const script of ['format', 'lint']) {
    const r = npm(script, cwd);
    if (!r.error && r.status === 0) continue;
    const out = [r.stdout, r.stderr, r.error?.message].filter(Boolean).join('\n').trim().slice(-MAX);
    process.stderr.write(
      `${out}\nFix every error and warning, then re-run \`npm run format && npm run lint\` before completing this task.`
    );
    process.exit(2);
  }
}

await main();
