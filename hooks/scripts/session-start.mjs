// SessionStart hook: tell Claude the local date and time, plus the Graphify usage rules when a graph is ready.
// Prints one JSON object with hookSpecificOutput.additionalContext.
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readState, statePath, treeSnapshot, writeState } from './git-state.mjs';
import { graphifyConfigured, graphifyFilesExist } from './graphify.mjs';
import { readStdin } from './tools.mjs';

function dateLine(now = new Date()) {
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
function recordBaseline(input) {
  const cwd = realpathSync(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
  const file = statePath('commit', cwd, typeof input.session_id === 'string' ? input.session_id : '');
  const s = readState(file);
  if (input.source === 'compact' && s.baseline !== undefined) return;
  const snap = treeSnapshot(cwd, { exclude: ['graphify-out'], timeout: 4000 });
  if (!snap) return;
  s.baseline = snap.fp;
  writeState(file, s);
}

async function main() {
  let input = {};
  try {
    input = JSON.parse(await readStdin()) ?? {};
  } catch {
    // No usable input; the date line still helps.
  }
  const context = [dateLine()];
  try {
    const cwd = realpathSync(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
    if (graphifyConfigured(cwd) && graphifyFilesExist(cwd)) {
      const root = process.env.CLAUDE_PLUGIN_ROOT || fileURLToPath(new URL('../..', import.meta.url));
      const rules = readFileSync(path.join(root, 'skills', 'setup-graphify', 'assets', 'graphify-rules.md'), 'utf8');
      context.push(
        `Use Graphify to navigate this repository:\n\n${rules.trim()}\n\nThe cdk Stop hook runs \`graphify update .\` after each turn that changed files; do not run it yourself.`
      );
    }
  } catch {
    // Graphify context is optional.
  }
  try {
    recordBaseline(input);
  } catch {
    // The baseline only keeps the commit Stop hook from sweeping pre-session work.
  }
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context.join('\n\n') } })
  );
}

await main();
