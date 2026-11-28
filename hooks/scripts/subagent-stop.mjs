// SubagentStop hook: blocks a `cdk:plan-implementer` from finishing until its report carries passing `Proof:` exit codes.
// `stop_hook_active` means the agent already continued once from this block, so it is let go instead of looping.
import { readJsonStdin, runIfMain } from './lib/hook-io.mjs';
import { problems } from './lib/subagent-report.mjs';

const realDeps = { stream: process.stdin, write: (text) => process.stdout.write(text) };

// Prints a block decision, or nothing when the report is acceptable.
export async function main(deps = {}) {
  const d = { ...realDeps, ...deps };
  const event = await readJsonStdin(d.stream);
  if (event.stop_hook_active === true) return;
  const report = event.last_assistant_message;
  if (typeof report !== 'string') return;
  const found = problems(report);
  if (found.length === 0) return;
  d.write(
    JSON.stringify({
      decision: 'block',
      reason: `Proof gate: ${found.join('; ')}. Fix it in the planned files, run the scoped checks, and return the full report.`
    })
  );
}

await runIfMain(import.meta.url, main, { label: 'subagent-stop' });
