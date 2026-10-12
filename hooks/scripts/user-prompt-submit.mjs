// UserPromptSubmit dispatcher: one hook so the plan-mode context always comes before the end-of-task steps.
// Prints one JSON object or nothing; never blocks and never fails the turn.
import { pathToFileURL } from 'node:url';
import { decide as planDecide, output as planOutput } from './plan-mode.mjs';
import { decide as taskDecide, output as taskOutput } from './task-end.mjs';
import { readStdin } from './tools.mjs';

// Join both hook outputs (plan-mode first); null when neither has any.
export function merge(planOut, taskOut) {
  const outs = [planOut, taskOut].filter(Boolean);
  if (!outs.length) return null;
  const result = {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: outs.map((o) => o.hookSpecificOutput.additionalContext).join('\n\n')
    }
  };
  if (planOut?.systemMessage) result.systemMessage = planOut.systemMessage;
  return result;
}

async function main() {
  let event;
  try {
    event = JSON.parse(await readStdin());
  } catch {
    return;
  }
  const out = merge(planOutput(planDecide(event)), taskOutput(taskDecide(event)));
  if (out) process.stdout.write(JSON.stringify(out));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch {
    // A hook must never fail the turn.
  }
}
