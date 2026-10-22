// Release notes for cdk:publish-github-release: one released section of a Keep a Changelog file, rendered verbatim.
// Writes only the `--notes-out` file, which must sit under os.tmpdir() or CLAUDE_JOB_DIR. CLI: `notes --version <x.y.z|latest> [--changelog <path>] [--notes-out <file>]`, JSON on stdout.
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

// Official SemVer 2.0.0 regex (semver.org).
/* eslint-disable security/detect-unsafe-regex -- the official pattern, applied to a version string only */
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
/* eslint-enable security/detect-unsafe-regex */
const HEADING = /^##\s+\[([^\]]+)\](.*)$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const fail = (code, message, fix) => ({ code, message, fix });

export const isSemver = (v) => SEMVER.test(String(v ?? ''));

const validDate = (s) => {
  const m = DATE.exec(s ?? '');
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
};

// Split into `## [x]` sections; headings inside code fences are ignored.
export function parseChangelog(text) {
  const sections = [];
  let cur = null;
  let fence = null;
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const f = /^\s*(```+|~~~+)(.*)$/.exec(line);
    if (f && !fence) {
      if (f[1][0] === '~' || !f[2].includes('`')) fence = f[1];
    } else if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !f[2].trim()) fence = null;
    const h = !fence && HEADING.exec(line);
    if (h) {
      const rest = h[2].trim();
      cur = {
        label: h[1].trim(),
        date: /^-\s+(\S+)/.exec(rest)?.[1] ?? null,
        yanked: /\[YANKED\]/i.test(rest),
        lines: []
      };
      sections.push(cur);
    } else if (cur && !(!fence && /^\[([^\]]+)\]:\s*\S+/.test(line))) cur.lines.push(line);
  }
  for (const s of sections) {
    s.body = s.lines.join('\n').trim();
    delete s.lines;
  }
  return { sections, unterminated: Boolean(fence) };
}

// `version` is `latest` (first released section) or an exact `x.y.z`; the section body becomes the notes.
export function notes({ changelog, version = 'latest' } = {}) {
  const { sections, unterminated } = parseChangelog(changelog);
  if (unterminated)
    return {
      ok: false,
      errors: [fail('unterminated-fence', 'a code fence is never closed', 'close the fence in the changelog')]
    };
  const released = sections.filter((s) => s.label.toLowerCase() !== 'unreleased');
  if (!released.length)
    return {
      ok: false,
      errors: [fail('no-release', 'no `## [x.y.z]` release section found', 'cut a release first in the changelog')]
    };
  const section = version === 'latest' ? released[0] : released.find((s) => s.label === version);
  if (!section)
    return {
      ok: false,
      errors: [fail('version-not-found', `no changelog section for ${version}`, 'pass a version the changelog has')]
    };
  const errors = [];
  if (!isSemver(section.label))
    errors.push(
      fail('invalid-semver', `"${section.label}" is not a Semantic Versioning 2.0.0 version`, 'fix the heading')
    );
  if (section.yanked)
    errors.push(fail('yanked', `${section.label} is marked [YANKED]`, 'release a non-yanked version'));
  if (!validDate(section.date))
    errors.push(
      fail(
        'invalid-date',
        `${section.label} has no valid YYYY-MM-DD date (found ${section.date ?? 'none'})`,
        'date the heading as `## [x.y.z] - YYYY-MM-DD`'
      )
    );
  if (!section.body)
    errors.push(fail('empty-notes', `${section.label} has no notes`, 'add its entries; notes are never invented'));
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    errors: [],
    version: section.label,
    date: section.date,
    prerelease: Boolean(SEMVER.exec(section.label)[4]),
    notes: `${section.body}\n`
  };
}

// True when `target` is strictly below `root`.
function inside(root, target) {
  const rel = path.relative(root, target);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
}

// Side effects the CLI needs; tests pass stubs, everything else uses the real ones.
const realDeps = {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  realpathSync,
  tmpdir,
  env: process.env,
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (argv[0] !== 'notes') {
    d.error('usage: changelog-notes.mjs notes --version <x.y.z|latest> [--changelog <path>] [--notes-out <file>]');
    return 2;
  }
  const file = path.resolve(arg(argv, '--changelog') ?? 'CHANGELOG.md');
  if (!d.existsSync(file)) {
    d.log(
      JSON.stringify({
        ok: false,
        errors: [fail('no-changelog', `${file} does not exist`, 'create the changelog first')]
      })
    );
    return 1;
  }
  const res = notes({ changelog: d.readFileSync(file, 'utf8'), version: arg(argv, '--version') ?? 'latest' });
  const rawOut = arg(argv, '--notes-out');
  if (res.ok && rawOut) {
    const out = path.resolve(rawOut);
    const tmp = d.tmpdir();
    const roots = [tmp, d.realpathSync(tmp), d.env.CLAUDE_JOB_DIR].filter(Boolean).map((r) => path.resolve(r));
    if (!roots.some((r) => inside(r, out))) {
      d.log(
        JSON.stringify({
          ok: false,
          errors: [
            fail(
              'notes-out-outside-scratch',
              `${out} is outside the scratch directory`,
              'write under the scratch directory or os.tmpdir()'
            )
          ]
        })
      );
      return 1;
    }
    d.mkdirSync(path.dirname(out), { recursive: true });
    d.writeFileSync(out, res.notes);
  }
  d.log(JSON.stringify(res));
  return res.ok ? 0 : 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'changelog-notes');
