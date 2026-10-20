// SessionStart hook: tell Claude the local date and time, plus a pointer to the Graphify usage rules when a graph is ready.
// Prints one JSON object with hookSpecificOutput.additionalContext.
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { graphifyConfigured, graphifyFilesExist } from './graphify.mjs';
import { contextOutput, projectDir } from './hook-io.mjs';

// Side effects as a swappable bundle so tests never touch graphify, the fs, the clock, or the temp dir.
export const realDeps = {
  graphifyConfigured,
  graphifyFilesExist,
  realpathSync,
  now: () => new Date(),
  env: process.env,
  cwd: () => process.cwd(),
  defaultRoot: () => fileURLToPath(new URL('../../..', import.meta.url))
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
  const cwd = projectDir(input, { env: deps.env, cwd: deps.cwd, realpath: deps.realpathSync });
  if (deps.graphifyConfigured(cwd) && deps.graphifyFilesExist(cwd)) {
    const root = deps.env.CLAUDE_PLUGIN_ROOT || deps.defaultRoot();
    const rules = path.join(root, 'skills', 'setup-graphify', 'assets', 'graphify-rules.md');
    context.push(`Graphify is set up; read ${rules} before navigating code.`);
  }
  return contextOutput('SessionStart', context.join('\n\n'));
}
