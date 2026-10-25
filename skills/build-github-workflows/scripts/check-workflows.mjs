// Mechanical checks for build-github-workflows: `posix`, `pins`, and `naming` over workflow and composite action files.
// CLI: file paths as args; JSON `{ ok, findings }` on stdout; `ok` ignores `naming` findings, which are info only.
import { readFileSync, realpathSync } from 'node:fs';
import { basename, resolve, sep } from 'node:path';
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

const finding = (check, path, line, message, fix) => ({ check, path, line, message, fix });

// The banned list in `practices.md` `## Shell`.
const BANNED = [
  [/\[\[/, '`[[ ]]`', 'use `[ ]`'],
  [/pipefail/, '`pipefail`', 'drop it; `sh` has no pipefail'],
  [/(^|[\s;&|])source\s/, '`source`', 'use `.`'],
  [/(^|\s)function\s+\w+/, '`function name {`', 'use `name() {`'],
  [/(^|[\s;&|])local\s/, '`local`', 'use a plain variable'],
  [/\$'/, "`$'…'`", 'use `printf`'],
  [/\$\{[^}]*,,[^}]*\}/, '`${var,,}`', 'use `tr` or `case`'],
  [/\$\{[^}]*\/\/[^}]*\}/, '`${var//a/b}`', 'use `sed` or `case`'],
  [/<\(/, 'process substitution `<( )`', 'use a temp file or a pipe'],
  [/\[\s[^\]]*==[^\]]*\]/, '`==` inside `[ ]`', 'use `=`'],
  [/\becho\s+-e\b/, '`echo -e`', 'use `printf`'],
  [/&>/, '`&>`', 'use `>file 2>&1`'],
  [/\b\w+=\(/, 'array assignment', 'use positional parameters or a newline list'],
  [/\$\{\w+\[[@*\d]/, 'array expansion', 'use positional parameters or a newline list']
];

// Lines inside `run:` blocks, as `{ line, text }`; a block scalar ends at the first line indented at or below its key.
function runLines(text) {
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)(?:- )?run:\s*(.*)$/);
    if (!m) continue;
    const value = m[2];
    if (!/^[|>][+-]?\d?$/.test(value.trim())) {
      out.push({ line: i + 1, text: value });
      continue;
    }
    const keyIndent = m[1].length;
    for (let j = i + 1; j < lines.length; j++) {
      const indent = lines[j].match(/^\s*/)[0].length;
      if (lines[j].trim() && indent <= keyIndent) break;
      out.push({ line: j + 1, text: lines[j] });
    }
  }
  return out;
}

// `posix`: a banned bashism in a `run:` block.
export function checkPosix(path, text) {
  const findings = [];
  for (const { line, text: code } of runLines(text)) {
    if (code.trim().startsWith('#')) continue;
    for (const [re, name, fix] of BANNED) {
      if (re.test(code)) findings.push(finding('posix', path, line, `${name} is not POSIX sh`, fix));
    }
  }
  return findings;
}

const unquote = (s) => s.replace(/^['"]|['"]$/g, '');
const EXACT_TAG = /^v\d+\.\d+\.\d+$/;

// `pins`: remote `uses:` by exact tag or full SHA plus tag comment, local calls without `@`, and exact image tags.
export function checkPins(path, text) {
  const findings = [];
  text.split('\n').forEach((raw, i) => {
    const line = i + 1;
    const uses = raw.match(/^\s*(?:- )?uses:\s*(\S+)(.*)$/);
    if (uses) {
      const ref = unquote(uses[1]);
      const at = ref.indexOf('@');
      if (ref.startsWith('./')) {
        if (at !== -1) findings.push(finding('pins', path, line, `local call \`${ref}\` has an @ref`, 'drop the @ref'));
      } else if (!ref.startsWith('docker://')) {
        const pin = at === -1 ? '' : ref.slice(at + 1);
        const ok =
          EXACT_TAG.test(pin) || (/^[0-9a-f]{40}$/.test(pin) && EXACT_TAG.test(uses[2].match(/#\s*(\S+)/)?.[1] ?? ''));
        if (!ok) {
          findings.push(
            finding('pins', path, line, `\`${ref}\` is not pinned`, 'use `@vX.Y.Z` or `@<40-hex> # vX.Y.Z`')
          );
        }
      }
      return;
    }
    const image = raw.match(/^\s*image:\s*(\S+)/);
    if (image && !image[1].includes('${{')) {
      const name = unquote(image[1]);
      const tag = name.match(/:([^:/]+)$/)?.[1];
      if (!tag || tag === 'latest' || !/\d/.test(tag) || /^v?\d+$/.test(tag)) {
        findings.push(
          finding('pins', path, line, `image \`${name}\` has no exact tag`, 'use an exact tag, never latest or a major')
        );
      }
    }
  });
  return findings;
}

const VERBS = ['lint', 'format', 'typecheck', 'test', 'build', 'scan', 'publish', 'deploy', 'release', 'gate'];
const isCalleeStem = (stem) => {
  const [verb, ...nouns] = stem.slice(1).split('-');
  return stem.startsWith('_') && VERBS.includes(verb) && nouns.every((n) => /^[a-z0-9]+$/.test(n));
};

// `naming`: a callee file stem is `_<verb>[-<noun>]`; existing names are kept, so this is info.
export function checkNaming(path, text) {
  const file = basename(path);
  if (!/\.ya?ml$/.test(file) || /^action\.ya?ml$/.test(file)) return [];
  if (!file.startsWith('_') && !/^\s*workflow_call:/m.test(text)) return [];
  const stem = file.replace(/\.ya?ml$/, '');
  if (isCalleeStem(stem)) return [];
  return [
    finding(
      'naming',
      path,
      1,
      `info: callee \`${file}\` is not \`_<verb>[-<noun>]\` with a verb from ${VERBS.join(', ')}`,
      'keep an existing name; name new callees this way'
    )
  ];
}

const realDeps = {
  readFile: (p) => readFileSync(p, 'utf8'),
  cwd: () => process.cwd(),
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (argv.length === 0) {
    d.error('usage: check-workflows.mjs <workflow or action file…>');
    return 2;
  }
  const root = d.cwd();
  const findings = [];
  for (const path of argv) {
    const abs = resolve(root, path);
    if (abs !== root && !abs.startsWith(root + sep)) throw new Error(`path outside the working directory: ${path}`);
    const text = d.readFile(abs);
    findings.push(...checkPosix(path, text), ...checkPins(path, text), ...checkNaming(path, text));
  }
  const ok = findings.every((f) => f.check === 'naming');
  d.log(JSON.stringify({ ok, findings }));
  return ok ? 0 : 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'check-workflows');
