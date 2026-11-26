// Size counts and score means for audit-skill; the file is read here and never embedded in a command.
// CLI: `count.mjs <absolute path>` prints JSON `{ok, lines, chars, words, bodyLines, bodyChars}`; `count.mjs --mean <n>…` prints `{ok, mean}` to one decimal. Exit 0 = ok, 1 = read failed, 2 = bad arguments.
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

const PATH_OK = /^[A-Za-z0-9._/-]+$/;

// True for an absolute path of safe characters with no `..` segment.
// No project containment on purpose: audits read user-scope (`~/.claude`) and plugin-scope skills/agents, not only the repo.
export function isSafePath(path) {
  return path.startsWith('/') && PATH_OK.test(path) && !path.split('/').includes('..');
}

// Counts lines (a trailing newline adds none), characters, and words; `body*` skip a leading `---` frontmatter block.
export function countText(text) {
  const lines = (s) => (s === '' ? 0 : s.split('\n').length - (s.endsWith('\n') ? 1 : 0));
  const all = String(text ?? '');
  const m = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/.exec(all);
  const body = m ? all.slice(m[0].length) : all;
  return {
    lines: lines(all),
    chars: [...all].length,
    words: all.split(/\s+/).filter(Boolean).length,
    bodyLines: lines(body),
    bodyChars: [...body].length
  };
}

// Mean of finite numbers rounded to one decimal; null when the list is empty or holds a non-number.
export function mean(values) {
  const nums = values.map((v) => (/^-?\d+$|^-?\d+\.\d+$/.test(v) ? Number(v) : NaN));
  if (nums.length === 0 || nums.some(Number.isNaN)) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

const realDeps = {
  readFile: (path) => readFileSync(path, 'utf8'),
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (argv[0] === '--mean') {
    const value = mean(argv.slice(1));
    if (value === null) {
      d.error('usage: count.mjs --mean <number>…');
      return 2;
    }
    d.log(JSON.stringify({ ok: true, mean: value }));
    return 0;
  }
  if (argv.length !== 1 || !isSafePath(argv[0])) {
    d.error('usage: count.mjs <absolute path matching ^[A-Za-z0-9._/-]+$ with no .. segment> | --mean <number>…');
    return 2;
  }
  d.log(JSON.stringify({ ok: true, ...countText(d.readFile(argv[0])) }));
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'count');
