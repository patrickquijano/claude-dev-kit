// SessionStart hook: tell Claude the local date and time, and that project instructions exist.
// Prints one JSON object with hookSpecificOutput.additionalContext.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { contextOutput } from './hook-io.mjs';

// Side effects as a swappable bundle so tests never touch the clock or the file system.
export const realDeps = {
  now: () => new Date(),
  exists: existsSync,
  projectDir: () => process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
};

const INSTRUCTION_PATHS = ['CLAUDE.md', '.claude/CLAUDE.md', 'AGENTS.md', '.claude/rules'];

// Advisory only: a presence check, never a scan of the files' text.
export function instructionsLine(dir, exists = existsSync) {
  return INSTRUCTION_PATHS.some((rel) => exists(join(dir, rel)))
    ? 'Project instructions found; cdk skills defer to them.'
    : '';
}

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

// The SessionStart hook's JSON output; `_input` is unused, but the entry script still parses stdin with readJsonStdin on purpose so a non-object payload fails (`.claude/rules/es-modules.md`).
export function sessionStart(_input, deps = realDeps) {
  const lines = [dateLine(deps.now()), instructionsLine(deps.projectDir(), deps.exists)].filter(Boolean);
  return contextOutput('SessionStart', lines.join('\n'));
}
