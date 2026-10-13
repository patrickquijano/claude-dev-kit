// UserPromptSubmit dispatcher: one hook so the plan-mode context always comes before the end-of-task steps.
// Prints one JSON object or nothing; never blocks. An unexpected error exits 1 (exit 2 would erase the user's prompt).
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
  const out = merge(planOutput(planDecide(event)), taskOutput(taskDecide(event)));
  if (out) process.stdout.write(JSON.stringify(out));
}

await runIfMain(import.meta.url, main, { label: 'user-prompt-submit' });
