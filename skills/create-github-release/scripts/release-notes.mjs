// Release notes for create-github-release: one `## [x.y.z]` section of a Keep a Changelog file, and the merge of those notes into an existing release body.
// CLI: `versions --changelog <file>`, `section --version <x.y.z> --changelog <file>`, `merge --body <file> --notes <file>`; JSON on stdout, exit 0 = ok and 1 = a stop code. Reads files only.
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

const START = '<!-- changelog:start -->';
const END = '<!-- changelog:end -->';
const HEADING = /^##\s+\[([^\]]+)\]/;
const KAC = /^###\s+(Added|Changed|Deprecated|Removed|Fixed|Security)\s*$/i;
const LINK_DEF = /^\[[^\]]+\]:\s*\S+/;
const CHANGELOG_LINE = /^(\s*$|\s*([-*+]|\d+\.)\s|\s{2,}\S)/;

const lines = (text) => String(text).replace(/\r\n/g, '\n').split('\n');

// Marks each line as inside (true) or outside a fenced code block; the fence lines themselves count as inside.
function fenceMap(all) {
  let fence = null;
  return all.map((line) => {
    const f = /^\s*(```+|~~~+)/.exec(line);
    if (!f) return fence !== null;
    if (!fence) {
      fence = f[1];
      return true;
    }
    if (f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
    return true;
  });
}

// Released and unreleased `## [x]` headings outside code fences, in file order, as `{label, index}`.
function headings(all) {
  const inFence = fenceMap(all);
  const found = [];
  all.forEach((line, index) => {
    const h = !inFence[index] && HEADING.exec(line);
    if (h) found.push({ label: h[1].trim(), index });
  });
  return found;
}

// Version labels of the released sections (everything but `Unreleased`), in file order.
export function listVersions(changelog) {
  return headings(lines(changelog))
    .map((h) => h.label)
    .filter((label) => label.toLowerCase() !== 'unreleased');
}

// The body of the `## [version]` section without its heading and without trailing link definitions.
export function section(changelog, version) {
  const wanted = String(version ?? '')
    .trim()
    .replace(/^v(?=\d)/, '');
  if (!wanted) return { ok: false, code: 'no-version' };
  if (wanted.toLowerCase() === 'unreleased') return { ok: false, code: 'unreleased' };
  const all = lines(changelog);
  const found = headings(all);
  const at = found.findIndex((h) => h.label === wanted);
  if (at < 0) return { ok: false, code: 'no-section' };
  const body = all.slice(found[at].index + 1, found[at + 1]?.index ?? all.length);
  while (body.length && (!body[body.length - 1].trim() || LINK_DEF.test(body[body.length - 1]))) body.pop();
  const notes = body.join('\n').trim();
  return notes ? { ok: true, notes } : { ok: false, code: 'empty-section' };
}

// Splits the lines of a changelog block into the replaced part and the chunks to keep: text outside list items, and sections whose heading is not a Keep a Changelog one.
function keepFrom(block, notes) {
  const kept = [];
  let foreign = null;
  let loose = [];
  const flushLoose = () => {
    if (loose.length) kept.push(loose.join('\n'));
    loose = [];
  };
  for (const line of block) {
    const h = /^#{1,6}\s/.test(line);
    if (h) {
      flushLoose();
      foreign = KAC.test(line) || notes.includes(line.trim()) ? null : [line];
      if (foreign) kept.push(foreign);
      continue;
    }
    if (foreign) foreign.push(line);
    else if (!CHANGELOG_LINE.test(line) && !notes.includes(line.trim())) loose.push(line);
    else flushLoose();
  }
  flushLoose();
  return kept.map((chunk) => (Array.isArray(chunk) ? chunk.join('\n') : chunk).trim()).filter(Boolean);
}

// Where the changelog block sits in `all`: `[from, to)` line indexes, or null; markers win over the Keep a Changelog run.
function findBlock(all) {
  const s = all.findIndex((l) => l.trim() === START);
  const e = all.findIndex((l, i) => i > s && l.trim() === END);
  if (s >= 0 && e > s) return { from: s, to: e + 1, inner: all.slice(s + 1, e) };
  if (s >= 0 || all.some((l) => l.trim() === END)) return { error: 'bad-markers' };
  const inFence = fenceMap(all);
  const first = all.findIndex((l, i) => !inFence[i] && KAC.test(l));
  if (first < 0) return null;
  const next = all.findIndex((l, i) => i > first && !inFence[i] && /^#{1,2}\s/.test(l));
  const to = next < 0 ? all.length : next;
  return { from: first, to, inner: all.slice(first, to) };
}

// Puts `notes` between the changelog markers of `body`, replacing the existing changelog block and keeping everything else.
export function merge(body, notes) {
  const all = lines(body ?? '');
  const text = String(notes ?? '').trim();
  const found = findBlock(all);
  if (found?.error) return { ok: false, code: found.error };
  const block = `${START}\n${text}\n${END}`;
  if (!found) {
    const head = all.join('\n').trimEnd();
    return { ok: true, merged: `${head ? `${head}\n\n` : ''}${block}\n`, replaced: false, kept: [] };
  }
  const kept = keepFrom(found.inner, text);
  const parts = [
    all.slice(0, found.from).join('\n').trimEnd(),
    block,
    ...kept,
    all
      .slice(found.to)
      .join('\n')
      .replace(/^\s*\n/, '')
      .trimEnd()
  ].filter(Boolean);
  return { ok: true, merged: `${parts.join('\n\n')}\n`, replaced: true, kept };
}

function arg(argv, flag) {
  const i = argv.indexOf(flag);
  return i < 0 ? undefined : argv[i + 1];
}

const realDeps = {
  readFile: (file) => readFileSync(file, 'utf8'),
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

const USAGE =
  'usage: release-notes.mjs versions --changelog <file> | section --version <x.y.z> --changelog <file> | merge --body <file> --notes <file>';

// Reads `file`, or returns null when it does not exist.
function readOrNull(d, file) {
  try {
    return d.readFile(file);
  } catch (err) {
    if (err?.code === 'ENOENT') return null;
    throw err;
  }
}

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const [cmd] = argv;
  const files = { versions: ['--changelog'], section: ['--changelog'], merge: ['--body', '--notes'] }[cmd];
  if (!files || files.some((f) => !arg(argv, f)) || (cmd === 'section' && !arg(argv, '--version'))) {
    d.error(USAGE);
    return 2;
  }
  const texts = files.map((f) => readOrNull(d, arg(argv, f)));
  if (texts.some((t) => t === null)) {
    d.log(JSON.stringify({ ok: false, code: cmd === 'merge' ? 'no-file' : 'no-changelog' }));
    return 1;
  }
  const res =
    cmd === 'versions'
      ? { ok: true, versions: listVersions(texts[0]) }
      : cmd === 'section'
        ? section(texts[0], arg(argv, '--version'))
        : merge(texts[0], texts[1]);
  d.log(JSON.stringify(res));
  return res.ok ? 0 : 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'release-notes');
