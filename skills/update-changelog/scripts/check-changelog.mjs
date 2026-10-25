// Format check for update-changelog: header, section order, entry format, and link definitions of a Keep a Changelog file.
// Read-only. CLI: `check [--changelog <path>]`, JSON on stdout, exit 1 on findings.
import { existsSync, readFileSync, realpathSync } from 'node:fs';
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

const SECTION_ORDER = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];
const TITLE = '# Changelog';
const INTRO = 'All notable changes to this project will be documented in this file.';
const KAC = 'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)';
const SEMVER_LINE = 'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).';
const HEADING = /^##\s+\[([^\]]+)\](.*)$/;
const VERSION_TAIL = /^ - \d{4}-\d{2}-\d{2}(?: \[YANKED\])?$/;
const DEFINITION = /^\[([^\]]+)\]:\s*(\S+)/;
/* eslint-disable-next-line security/detect-unsafe-regex -- applied to a version string only */
const VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const finding = (code, line, message) => ({ code, line, message });

// Descending order compares major, minor, patch only; a pre-release sorts equal to its core.
const core = (v) => VERSION.exec(v)?.slice(1, 4).map(Number);
function compare(a, b) {
  const [x, y] = [core(a), core(b)];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

// Returns an array of `{ code, line, message }` findings; empty means the file conforms.
export function checkChangelog(text) {
  const out = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (!text.endsWith('\n') || text.endsWith('\n\n'))
    out.push(finding('file-end', lines.length, 'file must end with exactly one newline'));

  // Parse headings, subsections, entries, and definitions outside code fences.
  const headings = [];
  const defs = [];
  let fence = false;
  let sub = null;
  let entry = null;
  const closeEntry = () => {
    if (!entry) return;
    const last = entry.text.trim();
    if (!/[.:]$/.test(last) || (last.endsWith(':') && !entry.nested))
      out.push(finding('entry-period', entry.line, 'entry must be one sentence ending with a period'));
    entry = null;
  };
  lines.forEach((raw, i) => {
    const n = i + 1;
    if (/^\s*(```|~~~)/.test(raw)) fence = !fence;
    if (fence) return;
    const h = HEADING.exec(raw);
    const d = DEFINITION.exec(raw);
    const sec = /^###\s+(.*)$/.exec(raw);
    const bullet = /^(\s*)([-*+])\s+(.*)$/.exec(raw);
    if (h || d || sec || !raw.trim()) closeEntry();
    if (h) {
      headings.push({ label: h[1], tail: h[2], line: n, subs: [] });
      sub = null;
      if (n > 1 && lines[i - 1].trim()) out.push(finding('blank-lines', n, 'blank line required before a heading'));
      if (lines[i + 1]?.trim()) out.push(finding('blank-lines', n, 'blank line required after a heading'));
    } else if (d) defs.push({ label: d[1], url: d[2], line: n });
    else if (sec && headings.length) {
      headings.at(-1).subs.push({ name: sec[1].trim(), line: n });
      sub = sec[1].trim();
      if (lines[i - 1].trim()) out.push(finding('blank-lines', n, 'blank line required before a heading'));
      if (lines[i + 1]?.trim()) out.push(finding('blank-lines', n, 'blank line required after a heading'));
    } else if (bullet && headings.length) {
      if (bullet[2] !== '-') out.push(finding('bullet-style', n, 'use `-` bullets'));
      if (bullet[1].length === 0) {
        closeEntry();
        entry = { line: n, text: bullet[3], nested: false };
        if (sub === null) out.push(finding('entry-outside-section', n, 'entry is not under a ### section'));
      } else if (entry) {
        entry.nested = true;
        entry.text = bullet[3];
      }
      if (/\*\*/.test(raw)) out.push(finding('bold-marker', n, 'no bold prefixes or markers'));
    } else if (entry && raw.trim()) {
      entry.text += ` ${raw.trim()}`;
      if (/\*\*/.test(raw)) out.push(finding('bold-marker', n, 'no bold prefixes or markers'));
    }
  });
  closeEntry();

  // Header: exact title and intro, then the KaC line ending `,` with the SemVer line, or `.` without it.
  const semver = headings.some((h) => VERSION.test(h.label));
  const header = lines.slice(0, 6);
  if (header[0] !== TITLE) out.push(finding('header', 1, `first line must be "${TITLE}"`));
  if (header[2] !== INTRO) out.push(finding('header', 3, `line 3 must be "${INTRO}"`));
  const kac = header[4] ?? '';
  const expectEnd = semver ? ',' : '.';
  if (kac !== `${KAC}${expectEnd}`) out.push(finding('header', 5, `line 5 must be "${KAC}${expectEnd}"`));
  if (semver && header[5] !== SEMVER_LINE) out.push(finding('header', 6, `line 6 must be "${SEMVER_LINE}"`));
  if (!semver && lines.some((l) => l.startsWith('and this project adheres')))
    out.push(finding('header', 6, 'SemVer line only belongs in a SemVer project'));

  // Order: Unreleased first and present, versions descending, headings dated, subsections canonical.
  if (!headings.length || headings[0].label.toLowerCase() !== 'unreleased')
    out.push(finding('unreleased-first', headings[0]?.line ?? 1, '`## [Unreleased]` must be the first section'));
  else if (headings[0].label !== 'Unreleased' || headings[0].tail.trim())
    out.push(finding('unreleased-heading', headings[0].line, 'heading must be exactly `## [Unreleased]`'));
  const versions = headings.filter((h) => h.label.toLowerCase() !== 'unreleased');
  for (const h of versions) {
    if (!VERSION.test(h.label)) out.push(finding('invalid-semver', h.line, `"${h.label}" is not a SemVer version`));
    if (!VERSION_TAIL.test(h.tail))
      out.push(finding('heading-date', h.line, 'use `## [x.y.z] - YYYY-MM-DD` (+ ` [YANKED]`)'));
  }
  for (const h of headings) {
    h.subs.forEach((s, k) => {
      const idx = SECTION_ORDER.indexOf(s.name);
      if (idx < 0) out.push(finding('section-type', s.line, `"${s.name}" is not one of the six sections`));
      else if (k > 0 && SECTION_ORDER.indexOf(h.subs[k - 1].name) > idx)
        out.push(
          finding(
            'section-order',
            s.line,
            `${s.name} is out of order (Added, Changed, Deprecated, Removed, Fixed, Security)`
          )
        );
    });
  }
  const valid = versions.filter((h) => VERSION.test(h.label));
  valid.forEach((h, k) => {
    if (k > 0 && compare(valid[k - 1].label, h.label) <= 0)
      out.push(finding('version-order', h.line, `${h.label} must be below ${valid[k - 1].label} (descending)`));
  });

  // Links: one definition per heading plus lowercase `[unreleased]`, each used, newest first.
  const labels = headings.map((h) => (h.label.toLowerCase() === 'unreleased' ? 'unreleased' : h.label));
  const defLabels = defs.map((x) => x.label);
  for (const l of labels)
    if (!defLabels.includes(l)) out.push(finding('link-missing', 0, `no link definition for [${l}]`));
  for (const x of defs) {
    if (!labels.includes(x.label)) out.push(finding('link-unused', x.line, `definition [${x.label}] has no heading`));
  }
  const seen = new Set();
  for (const x of defs) {
    if (seen.has(x.label)) out.push(finding('link-duplicate', x.line, `definition [${x.label}] appears twice`));
    seen.add(x.label);
  }
  const used = defLabels.filter((l) => labels.includes(l));
  const order = labels.filter((l) => used.includes(l));
  if (used.some((l, k) => l !== order[k]))
    out.push(finding('link-order', defs[0]?.line ?? 0, 'definitions must be newest first, matching the heading order'));
  return out;
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
}

// Side effects the CLI needs; tests pass stubs, everything else uses the real ones.
const realDeps = {
  existsSync,
  readFileSync,
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (argv[0] !== 'check') {
    d.error('usage: check-changelog.mjs check [--changelog <path>]');
    return 2;
  }
  const file = path.resolve(arg(argv, '--changelog') ?? 'CHANGELOG.md');
  if (!d.existsSync(file)) {
    d.log(JSON.stringify({ ok: false, findings: [finding('no-changelog', 0, `${file} does not exist`)] }));
    return 1;
  }
  const findings = checkChangelog(d.readFileSync(file, 'utf8'));
  d.log(JSON.stringify({ ok: findings.length === 0, findings }));
  return findings.length ? 1 : 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'check-changelog');
