// Stop hook: format and lint the whole repository per changed file-type group (logic in lib/format-lint-repo.mjs).
import { formatLintRepo } from './lib/format-lint-repo.mjs';
import { readJsonStdin, runIfMain } from './lib/hook-io.mjs';

const realDeps = { stream: process.stdin, write: (text) => process.stdout.write(text), formatLintRepo };

// Prints the hook result object, or nothing when no group changed.
export async function main(deps = {}) {
  const d = { ...realDeps, ...deps };
  const input = await readJsonStdin(d.stream);
  const result = d.formatLintRepo(input);
  if (result) d.write(JSON.stringify(result));
}

await runIfMain(import.meta.url, main, { label: 'stop' });
