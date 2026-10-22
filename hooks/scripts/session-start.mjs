// SessionStart hook: inject the date and time (logic in lib/session-start.mjs).
import { readJsonStdin, runIfMain } from './lib/hook-io.mjs';
import { sessionStart } from './lib/session-start.mjs';

const realDeps = { stream: process.stdin, write: (text) => process.stdout.write(text), sessionStart };

// Prints one JSON object.
export async function main(deps = {}) {
  const d = { ...realDeps, ...deps };
  d.write(JSON.stringify(d.sessionStart(await readJsonStdin(d.stream))));
}

await runIfMain(import.meta.url, main, { label: 'session-start' });
