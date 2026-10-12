// PostToolUse hook: format and lint the file Claude just wrote or edited (logic in lib/format-lint.mjs).
import { formatLint } from './lib/format-lint.mjs';
import { readJsonStdin, runIfMain } from './lib/hook-io.mjs';

const realDeps = { stream: process.stdin, write: (text) => process.stdout.write(text), formatLint };

// Prints the hook result object, or nothing when there is nothing to report.
export async function main(deps = {}) {
  const d = { ...realDeps, ...deps };
  const input = await readJsonStdin(d.stream);
  const result = input && d.formatLint(input);
  if (result) d.write(JSON.stringify(result));
}

await runIfMain(import.meta.url, main);
