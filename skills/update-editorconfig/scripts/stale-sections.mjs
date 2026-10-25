// Stale-section finder for update-editorconfig: lists the root `.editorconfig` sections whose glob matches no repo file.
// Read-only. CLI: `stale-sections.mjs --root <abs git root>`, JSON on stdout; files = tracked plus untracked, not ignored.
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
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

const fail = (code, message, fix) => ({ code, message, fix });
const escapeChar = (c) => c.replace(/[\\^$.*+?()[\]{}|/-]/g, '\\$&');

// Index of the `}` closing the `{` at `open`, or -1.
function closingBrace(g, open) {
  let depth = 0;
  for (let i = open; i < g.length; i++) {
    if (g[i] === '\\') i++;
    else if (g[i] === '{') depth++;
    else if (g[i] === '}' && --depth === 0) return i;
  }
  return -1;
}

// Top-level comma split of a brace body.
function splitAlternatives(body) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '\\') cur += c + (body[++i] ?? '');
    else if (c === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      if (c === '{') depth++;
      if (c === '}') depth--;
      cur += c;
    }
  }
  parts.push(cur);
  return parts;
}

// EditorConfig glob body to regex source; a numeric range `{1..3}` throws RangeError (unsupported here).
function convert(g) {
  let out = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '\\' && i + 1 < g.length) out += escapeChar(g[++i]);
    else if (c === '*' && g[i + 1] === '*') {
      out += '.*';
      i++;
    } else if (c === '*') out += '[^/]*';
    else if (c === '?') out += '[^/]';
    else if (c === '[' && g.indexOf(']', i + 2) > 0) {
      const j = g.indexOf(']', i + 2);
      const body = g.slice(i + 1, j);
      out += `[${body[0] === '!' ? '^' : ''}${body.replace(/^!/, '').replace(/[\\\]^]/g, '\\$&')}]`;
      i = j;
    } else if (c === '{' && closingBrace(g, i) > 0) {
      const j = closingBrace(g, i);
      const body = g.slice(i + 1, j);
      if (/^-?\d+\.\.-?\d+$/.test(body)) throw new RangeError('numeric range');
      const parts = splitAlternatives(body);
      out += parts.length > 1 ? `(?:${parts.map(convert).join('|')})` : `\\{${convert(body)}\\}`;
      i = j;
    } else out += escapeChar(c);
  }
  return out;
}

// RegExp matching repo-relative paths, or null for an unsupported glob. No `/` in the glob → any depth; else relative to the config dir.
export function globToRegExp(glob) {
  try {
    const hasSlash = glob.includes('/');
    const body = convert(hasSlash ? glob.replace(/^\//, '') : glob);
    // eslint-disable-next-line security/detect-non-literal-regexp -- built only from escaped glob characters
    return new RegExp(hasSlash ? `^${body}$` : `^(?:.*/)?${body}$`);
  } catch (err) {
    if (err instanceof RangeError) return null;
    throw err;
  }
}

// Section headers after the preamble, with their 1-based line; comment lines are skipped.
export function parseSections(text) {
  const sections = [];
  text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .forEach((line, i) => {
      const m = /^\s*\[(.+)\]\s*$/.exec(line);
      if (m && !/^\s*[#;]/.test(line)) sections.push({ glob: m[1], line: i + 1 });
    });
  return sections;
}

// A section is stale when it is not a catch-all and its glob matches none of `files`; an unsupported glob is never stale.
export function staleSections(text, files) {
  const list = files.map((f) => f.replace(/^\.\//, ''));
  return parseSections(text).map(({ glob, line }) => {
    if (glob === '*' || glob === '**') return { glob, line, matches: list.length, stale: false };
    const re = globToRegExp(glob);
    if (!re)
      return { glob, line, matches: null, stale: false, note: 'unsupported glob (numeric range); check by hand' };
    const matches = list.filter((f) => re.test(f)).length;
    return { glob, line, matches, stale: matches === 0 };
  });
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
}

// Side effects the CLI needs; tests pass stubs.
const realDeps = {
  readFileSync,
  run: (file, args) => execFileSync(file, args, { encoding: 'utf8', timeout: 15000, maxBuffer: 64 * 1024 * 1024 }),
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const root = arg(argv, '--root');
  if (!root || !path.isAbsolute(root)) {
    d.error('usage: stale-sections.mjs --root <absolute git root>');
    return 2;
  }
  const file = path.join(path.resolve(root), '.editorconfig');
  let text;
  try {
    text = d.readFileSync(file, 'utf8');
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
    d.log(
      JSON.stringify({
        ok: false,
        errors: [fail('no-editorconfig', `${file} does not exist`, 'write the base first; nothing is stale')]
      })
    );
    return 1;
  }
  const files = d
    .run('git', ['-C', root, 'ls-files', '--cached', '--others', '--exclude-standard'])
    .split('\n')
    .filter(Boolean);
  const sections = staleSections(text, files);
  d.log(JSON.stringify({ ok: true, errors: [], sections, stale: sections.filter((s) => s.stale).map((s) => s.glob) }));
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'stale-sections');
