// UserPromptSubmit dispatcher: prints the plan-mode context and records the git baseline the Stop gate compares against.
// Prints one JSON object or nothing; never blocks. An unexpected error exits 1 (exit 2 would erase the user's prompt).
import { decide as planDecide, output as planOutput } from './lib/plan-mode.mjs';
import { snapshot } from './lib/task-end.mjs';
import { readJsonStdin, runIfMain } from './lib/hook-io.mjs';

export async function main(deps = {}) {
  const d = { snapshot, stream: process.stdin, write: (t) => process.stdout.write(t), ...deps };
  const event = await readJsonStdin(d.stream);
  const out = planOutput(planDecide(event));
  d.snapshot(event);
  if (out) d.write(JSON.stringify(out));
}

await runIfMain(import.meta.url, main, { label: 'user-prompt-submit' });
