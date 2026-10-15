// UserPromptSubmit dispatcher: prints the plan-mode context.
// Prints one JSON object or nothing; never blocks. An unexpected error exits 1 (exit 2 would erase the user's prompt).
import { decide as planDecide, output as planOutput } from './lib/plan-mode.mjs';
import { readJsonStdin, runIfMain } from './lib/hook-io.mjs';

export async function main(deps = {}) {
  const d = { stream: process.stdin, write: (t) => process.stdout.write(t), ...deps };
  const event = await readJsonStdin(d.stream);
  const out = planOutput(planDecide(event));
  if (out) d.write(JSON.stringify(out));
}

await runIfMain(import.meta.url, main, { label: 'user-prompt-submit' });
