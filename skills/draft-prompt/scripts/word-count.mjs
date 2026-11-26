// Word count for a drafted prompt, read from stdin or `--file`; fenced-code marker lines are not counted.
// CLI: `word-count.mjs [--limit <n>] [--file <path>] [< prompt.txt]`, JSON `{ok, words, limit}` on stdout; exit 1 when over the limit, 2 on bad arguments.
import { readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Runs `fn` only when this module is the entry script; an error it throws prints one stderr line and sets exit code 1.
async function runIfMain(metaUrl, fn, label) {
  if (!process.argv[1] || metaUrl !== pathToFileURL(realpathSync(process.argv[1])).href) return;
  try {
    const code = await fn();
    if (typeof code === 'number') process.exitCode = code;
  } catch (err) {
    process.stderr.write(
      `${label}: ${String(err?.message ?? err)
        .split('\n')[0]
        .slice(0, 300)}\n`
    );
    process.exitCode = 1;
  }
}

const DEFAULT_LIMIT = 250;

// Counts whitespace-separated words, skipping lines that only open or close a code fence.
export function countWords(text) {
  const body = String(text ?? '')
    .split('\n')
    .filter((line) => !/^\s*(```|~~~)/.test(line))
    .join(' ');
  const words = body.split(/\s+/).filter(Boolean);
  return words.length;
}

// Side effects the CLI needs; tests pass stubs.
const realDeps = {
  readStdin: () => readFileSync(0, 'utf8'),
  readFile: (path) => readFileSync(path, 'utf8'),
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const i = argv.indexOf('--limit');
  const limit = i < 0 ? DEFAULT_LIMIT : Number(argv[i + 1]);
  const f = argv.indexOf('--file');
  const file = f < 0 ? null : argv[f + 1];
  if (!Number.isInteger(limit) || limit < 1 || (f >= 0 && (!file || file.startsWith('-')))) {
    d.error('usage: word-count.mjs [--limit <positive integer>] [--file <path>] [< prompt.txt]');
    return 2;
  }
  const words = countWords(file ? d.readFile(file) : d.readStdin());
  const ok = words <= limit;
  d.log(JSON.stringify({ ok, words, limit }));
  return ok ? 0 : 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'word-count');
