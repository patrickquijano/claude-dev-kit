// UserPromptSubmit dispatcher: one hook so the plan-mode context always comes before the end-of-task steps.
// Prints one JSON object or nothing; never blocks and never fails the turn.
import { decide as planDecide, output as planOutput } from './lib/plan-mode.mjs';
import { decide as taskDecide, output as taskOutput } from './lib/task-end.mjs';
import { contextOutput, readJsonStdin, runIfMain } from './lib/hook-io.mjs';

// Join both hook outputs (plan-mode first); null when neither has any.
export function merge(planOut, taskOut) {
  const outs = [planOut, taskOut].filter(Boolean);
  if (!outs.length) return null;
  return contextOutput(
    'UserPromptSubmit',
    outs.map((o) => o.hookSpecificOutput.additionalContext).join('\n\n'),
    planOut?.systemMessage ? { systemMessage: planOut.systemMessage } : {}
  );
}

async function main() {
  const event = await readJsonStdin();
  if (!event) return;
  const out = merge(planOutput(planDecide(event)), taskOutput(taskDecide(event)));
  if (out) process.stdout.write(JSON.stringify(out));
}

await runIfMain(import.meta.url, async () => {
  try {
    await main();
  } catch {
    // A hook must never fail the turn.
  }
});
