// SessionStart hook: tell Claude the local date and time, plus the Graphify usage rules when a graph is ready.
// Prints one JSON object with hookSpecificOutput.additionalContext.
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readState, statePath, treeSnapshot, writeState } from './git-state.mjs';
import { graphifyConfigured, graphifyFilesExist } from './graphify.mjs';
import { readStdin } from './tools.mjs';

// Side effects as a swappable bundle so tests never touch git, graphify, the fs, the clock, or the temp dir.
export const realDeps = {
  graphifyConfigured,
  graphifyFilesExist,
  readFileSync,
  readState,
  realpathSync,
  statePath,
  treeSnapshot,
  writeState,
  now: () => new Date(),
  env: process.env,
  cwd: () => process.cwd(),
  defaultRoot: () => fileURLToPath(new URL('../..', import.meta.url))
};

export function dateLine(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  return `Today is ${parts.weekday}, ${parts.month}, ${parts.day}, ${parts.year} and the current time is ${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
}

// Remembers the tree as found at session start so commit-stop.mjs leaves pre-session work alone; `compact` keeps it.
export function recordBaseline(input, deps = realDeps) {
  const cwd = deps.realpathSync(deps.env.CLAUDE_PROJECT_DIR || input.cwd || deps.cwd());
  const file = deps.statePath('commit', cwd, typeof input.session_id === 'string' ? input.session_id : '');
  const s = deps.readState(file);
  if (input.source === 'compact' && s.baseline !== undefined) return;
  const snap = deps.treeSnapshot(cwd, { exclude: ['graphify-out'], timeout: 4000 });
  if (!snap) return;
  s.baseline = snap.fp;
  deps.writeState(file, s);
}

// The SessionStart hook's JSON output for a parsed input.
export function sessionStart(input = {}, deps = realDeps) {
  const context = [dateLine(deps.now())];
  try {
    const cwd = deps.realpathSync(deps.env.CLAUDE_PROJECT_DIR || input.cwd || deps.cwd());
    if (deps.graphifyConfigured(cwd) && deps.graphifyFilesExist(cwd)) {
      const root = deps.env.CLAUDE_PLUGIN_ROOT || deps.defaultRoot();
      const rules = deps.readFileSync(
        path.join(root, 'skills', 'setup-graphify', 'assets', 'graphify-rules.md'),
        'utf8'
      );
      context.push(
        `Use Graphify to navigate this repository:\n\n${rules.trim()}\n\nThe cdk Stop hook runs \`graphify update .\` after each turn that changed files; do not run it yourself.`
      );
    }
  } catch {
    // Graphify context is optional.
  }
  try {
    recordBaseline(input, deps);
  } catch {
    // The baseline only keeps the commit Stop hook from sweeping pre-session work.
  }
  return { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context.join('\n\n') } };
}

async function main() {
  let input = {};
  try {
    const parsed = JSON.parse(await readStdin());
    if (parsed && typeof parsed === 'object') input = parsed;
  } catch {
    // No usable input; the date line still helps.
  }
  process.stdout.write(JSON.stringify(sessionStart(input)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
