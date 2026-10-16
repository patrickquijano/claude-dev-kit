// Stop hook: format and lint the whole repository per changed file-type group (lib/format-lint-repo.mjs), then block
// once per distinct uncommitted working-tree state with the end-of-task steps (lib/task-end.mjs).
import { formatLintRepo } from './lib/format-lint-repo.mjs';
import { readJsonStdin, runIfMain } from './lib/hook-io.mjs';
import { gate } from './lib/task-end.mjs';

const realDeps = { stream: process.stdin, write: (text) => process.stdout.write(text), formatLintRepo, gate };

// Prints the hook result object, or nothing when no group changed and no step is pending.
export async function main(deps = {}) {
  const d = { ...realDeps, ...deps };
  const input = await readJsonStdin(d.stream);
  const lint = d.formatLintRepo(input);
  // Lint failures first; the gate checks again on the next stop because it has not fired yet.
  if (lint?.decision === 'block') return d.write(JSON.stringify(lint));
  const pending = d.gate(input);
  if (pending) {
    const message = [lint?.systemMessage, pending.systemMessage].filter(Boolean).join(' | ');
    return d.write(JSON.stringify({ ...pending, systemMessage: message }));
  }
  if (lint) d.write(JSON.stringify(lint));
}

await runIfMain(import.meta.url, main, { label: 'stop' });
