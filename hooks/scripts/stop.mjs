// Stop hook: format and lint the whole repository per changed file-type group (lib/format-lint-repo.mjs).
import { formatLintRepo } from './lib/format-lint-repo.mjs';
import { readJsonStdin, runIfMain } from './lib/hook-io.mjs';

const realDeps = { stream: process.stdin, write: (text) => process.stdout.write(text), formatLintRepo };

// Prints the hook result object, or nothing when no group changed.
export async function main(deps = {}) {
  const d = { ...realDeps, ...deps };
  const lint = d.formatLintRepo(await readJsonStdin(d.stream));
  if (lint) d.write(JSON.stringify(lint));
}

await runIfMain(import.meta.url, main, { label: 'stop', failCode: 0 });
