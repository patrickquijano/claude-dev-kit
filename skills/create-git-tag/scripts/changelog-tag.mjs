// Release for create-git-tag: the newest dated version in a CHANGELOG.md, its `v<version>` tag, and the annotated-tag message (`Release <version>` + the section body).
// CLI: `changelog-tag.mjs <file>` prints JSON, `--message <file>` prints the raw message; exit 0 = a release, 1 = a stop code, 2 = bad arguments. Reads one file; no git or network access.
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

// Official SemVer 2.0.0 pattern (semver.org), unanchored for use inside the heading pattern.
const SEMVER_SRC =
  '(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+(?:[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?';
const HEADING = new RegExp(`^## +\\[?(${SEMVER_SRC})\\]? +- +(\\d{4}-\\d{2}-\\d{2}) *$`);
const LINK_REF = /^\[[^\]]+\]:\s*\S+/;

const fail = (code, message, fix) => ({ ok: false, code, message, fix });

// `{ok, version, date, body}` for the first dated version heading (`## [1.2.3] - 2026-01-31`) and its section body, else a `no-dated-version` stop.
export function findRelease(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  const start = lines.findIndex((l) => HEADING.test(l));
  if (start < 0)
    return fail('no-dated-version', 'no `## [x.y.z] - YYYY-MM-DD` heading', 'run the changelog release step first');
  const [, version, date] = HEADING.exec(lines[start]);
  const rest = lines.slice(start + 1);
  const next = rest.findIndex((l) => l.startsWith('## '));
  const body = (next < 0 ? rest : rest.slice(0, next)).map((l) => l.trimEnd());
  while (body.length && (body.at(-1) === '' || LINK_REF.test(body.at(-1)))) body.pop();
  while (body.length && body[0] === '') body.shift();
  return { ok: true, version, date, body: body.join('\n') };
}

// The annotated-tag message: `Release <version>`, then a blank line and the body when there is one.
export function buildMessage(version, body) {
  return body ? `Release ${version}\n\n${body}` : `Release ${version}`;
}

const realDeps = {
  readFile: (file) => readFileSync(file, 'utf8'),
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const raw = argv[0] === '--message';
  const args = raw ? argv.slice(1) : argv;
  if (args.length !== 1 || !args[0]) {
    d.error('usage: changelog-tag.mjs [--message] <CHANGELOG.md>');
    return 2;
  }
  let text;
  try {
    text = d.readFile(args[0]);
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
    d.log(JSON.stringify(fail('no-changelog', 'CHANGELOG.md not found', 'create it first')));
    return 1;
  }
  const rel = findRelease(text);
  if (!rel.ok) {
    d.log(JSON.stringify(rel));
    return 1;
  }
  const message = buildMessage(rel.version, rel.body);
  d.log(raw ? message : JSON.stringify({ ok: true, version: rel.version, tag: `v${rel.version}`, message }));
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'changelog-tag');
