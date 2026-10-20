// SessionStart hook: tell Claude the local date and time, plus a pointer to the Graphify usage rules when a graph is ready.
// Prints one JSON object with hookSpecificOutput.additionalContext.
import { existsSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { git, shipReleaseMarker } from './git-state.mjs';
import { graphifyConfigured, graphifyFilesExist } from './graphify.mjs';
import { contextOutput, projectDir } from './hook-io.mjs';

// Side effects as a swappable bundle so tests never touch git, graphify, the fs, the clock, or the temp dir.
export const realDeps = {
  graphifyConfigured,
  graphifyFilesExist,
  realpathSync,
  existsSync,
  statSync,
  git,
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
  // A fresh session cannot own a ship-release run; resume and compact may still be inside one.
  if (['startup', 'clear', 'fork'].includes(input.source)) {
    const marker = shipReleaseMarker(cwd, deps.git, deps.existsSync);
    if (marker)
      context.push(
        `A /cdk:ship-release marker exists (${marker}, modified ${deps.statSync(marker).mtime.toISOString()}) but no ship-release run is active in this new session, so end-of-task commits are suppressed. Ask the user whether to delete the marker.`
      );
  }
  return contextOutput('SessionStart', context.join('\n\n'));
}
