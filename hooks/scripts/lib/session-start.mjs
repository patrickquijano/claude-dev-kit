// SessionStart hook: tell Claude the local date and time.
// Prints one JSON object with hookSpecificOutput.additionalContext.
import { contextOutput } from './hook-io.mjs';

// Side effects as a swappable bundle so tests never touch the clock.
export const realDeps = { now: () => new Date() };

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
export function sessionStart(_input, deps = realDeps) {
  return contextOutput('SessionStart', dateLine(deps.now()));
}
