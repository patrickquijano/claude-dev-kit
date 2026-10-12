// SessionStart hook: tell Claude the local date and time, plus the Graphify usage rules when a graph is ready.
// Prints one JSON object with hookSpecificOutput.additionalContext.
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { graphifyConfigured, graphifyFilesExist } from './graphify.mjs';
import { readStdin } from './tools.mjs';

// Side effects as a swappable bundle so tests never touch git, graphify, the fs, the clock, or the temp dir.
export const realDeps = {
  graphifyConfigured,
  graphifyFilesExist,
  readFileSync,
  realpathSync,
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
        `Use Graphify to navigate this repository:\n\n${rules.trim()}\n\nA cdk end-of-task instruction names the graphify step to run once the task is done; do not run it on your own.`
      );
    }
  } catch {
    // Graphify context is optional.
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
