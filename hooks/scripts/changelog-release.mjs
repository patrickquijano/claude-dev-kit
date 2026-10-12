// Release plan for cdk:create-github-release: the latest released section of a Keep a Changelog file, its tag, and its notes.
// Writes only the `--notes-out` file. CLI: `plan [--changelog <path>] [--prefix <v|none>] [--repo-url <url>] [--notes-out <file>]`, JSON on stdout.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { git } from './git-state.mjs';

// Official SemVer 2.0.0 regex (semver.org).
/* eslint-disable security/detect-unsafe-regex -- the official pattern, applied to a version string only */
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
/* eslint-enable security/detect-unsafe-regex */
const HEADING = /^##\s+\[([^\]]+)\](.*)$/;
const REF = /^\[([^\]]+)\]:\s*(\S+)/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const fail = (code, message, fix) => ({ code, message, fix });

export const isSemver = (v) => SEMVER.test(String(v ?? ''));

// Compare by SemVer precedence; build metadata is ignored, a release outranks its prereleases.
export function cmpSemver(a, b) {
  const [ma, mb] = [SEMVER.exec(a), SEMVER.exec(b)];
  for (let i = 1; i <= 3; i++) if (ma[i] !== mb[i]) return Number(ma[i]) - Number(mb[i]);
  if (!ma[4] || !mb[4]) return ma[4] ? -1 : mb[4] ? 1 : 0;
  const [pa, pb] = [ma[4].split('.'), mb[4].split('.')];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i] === undefined) return -1;
    if (pb[i] === undefined) return 1;
    const [na, nb] = [/^\d+$/.test(pa[i]), /^\d+$/.test(pb[i])];
    if (na && nb && pa[i] !== pb[i]) return Number(pa[i]) - Number(pb[i]);
    if (na !== nb) return na ? -1 : 1;
    if (!na && pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

const validDate = (s) => {
  const m = DATE.exec(s ?? '');
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
};

// Split into `## [x]` sections (headings inside code fences ignored) and trailing link references.
export function parseChangelog(text) {
  const sections = [];
  const refs = {};
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
      const date = /^-\s+(\S+)/.exec(rest)?.[1] ?? null;
      cur = {
        label: h[1].trim(),
        date,
        yanked: /\[YANKED\]/i.test(rest),
        unreleased: h[1].trim().toLowerCase() === 'unreleased' || /unreleased/i.test(rest),
        lines: []
      };
      sections.push(cur);
    } else if (!fence && REF.test(line)) {
      const [, label, url] = REF.exec(line);
      refs[label] = url;
    } else if (cur) cur.lines.push(line);
  }
  for (const s of sections) {
    s.body = s.lines.join('\n').trim();
    delete s.lines;
  }
  return { sections, refs, unterminated: Boolean(fence) };
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Existing tags decide the prefix; with none, the changelog's link references may show it.
export function detectPrefix(tags, refs, versions) {
  const prefixes = new Set();
  const count = { v: 0, none: 0 };
  for (const t of tags) {
    const m = /^(v?)(.+)$/.exec(t);
    if (m && isSemver(m[2])) {
      prefixes.add(m[1]);
      count[m[1] ? 'v' : 'none']++;
    }
  }
  if (prefixes.size === 1) return { prefix: [...prefixes][0], source: 'tags' };
  if (prefixes.size > 1)
    return {
      error: fail(
        'prefix-ambiguous',
        `tags mix both forms (${count.v} with "v", ${count.none} without)`,
        'pass --prefix v or --prefix none'
      )
    };
  for (const v of versions) {
    const url = refs[v];
    // eslint-disable-next-line security/detect-non-literal-regexp -- the version is escaped by esc()
    const m = url && new RegExp(`(?:/|\\.\\.\\.)(v?)${esc(v)}(?=$|\\.\\.\\.|[?#])`).exec(url);
    if (m) return { prefix: m[1], source: 'changelog links' };
  }
  return {
    error: fail(
      'prefix-unknown',
      'no existing tag or changelog link shows the tag form',
      'pass --prefix v or --prefix none'
    )
  };
}

export function plan({ changelog, tags = [], prefix, repoUrl } = {}) {
  const errors = [];
  const { sections, refs, unterminated } = parseChangelog(changelog);
  if (unterminated)
    return {
      ok: false,
      errors: [fail('unterminated-fence', 'a code fence is never closed', 'close the fence in the changelog')]
    };
  const released = sections.filter((s) => !(s.label.toLowerCase() === 'unreleased'));
  if (!released.length) {
    const only = sections.some((s) => s.label.toLowerCase() === 'unreleased');
    return {
      ok: false,
      errors: [
        fail(
          only ? 'unreleased-only' : 'no-release',
          only ? 'the changelog has only an Unreleased section' : 'no `## [x.y.z]` release section found',
          'cut a release first with cdk:write-changelog (release)'
        )
      ]
    };
  }
  const top = released[0];
  const seen = new Set();
  for (const s of released) {
    if (seen.has(s.label))
      errors.push(fail('duplicate-version', `version ${s.label} appears twice`, 'remove the duplicate section'));
    seen.add(s.label);
  }
  if (!isSemver(top.label))
    errors.push(fail('invalid-semver', `"${top.label}" is not a Semantic Versioning 2.0.0 version`, 'fix the heading'));
  else {
    if (top.unreleased)
      errors.push(fail('unreleased', `${top.label} is marked unreleased`, 'finish the release in the changelog'));
    if (top.yanked) errors.push(fail('yanked', `${top.label} is marked [YANKED]`, 'release a non-yanked version'));
    if (!validDate(top.date))
      errors.push(
        fail(
          'invalid-date',
          `${top.label} has no valid YYYY-MM-DD date (found ${top.date ?? 'none'})`,
          'date the heading as `## [x.y.z] - YYYY-MM-DD`'
        )
      );
    if (SEMVER.exec(top.label)[4])
      errors.push(
        fail(
          'prerelease',
          `${top.label} is a pre-release version; only non-prerelease releases are created`,
          'release a stable version'
        )
      );
    if (!top.body)
      errors.push(
        fail('empty-notes', `${top.label} has no notes`, 'add its entries to the changelog; notes are never invented')
      );
    const newer = released.find((s) => isSemver(s.label) && cmpSemver(s.label, top.label) > 0);
    if (newer)
      errors.push(
        fail('not-newest', `${newer.label} is newer than the top release ${top.label}`, 'order sections newest first')
      );
  }
  const versions = released.map((s) => s.label).filter(isSemver);
  let pre;
  if (prefix !== undefined) pre = { prefix: prefix === 'none' ? '' : prefix, source: 'flag' };
  else pre = detectPrefix(tags, refs, versions);
  if (pre.error) errors.push(pre.error);
  else if (!['', 'v'].includes(pre.prefix))
    errors.push(
      fail('invalid-prefix', `prefix "${pre.prefix}" is not "v" or none`, 'pass --prefix v or --prefix none')
    );
  if (errors.length) return { ok: false, errors };

  const tag = `${pre.prefix}${top.label}`;
  const prev = released.slice(1).find((s) => isSemver(s.label) && !s.yanked && cmpSemver(s.label, top.label) < 0);
  const prevTag = prev && tags.includes(`${pre.prefix}${prev.label}`) ? `${pre.prefix}${prev.label}` : null;
  const compare = prevTag && repoUrl ? `${repoUrl.replace(/\/$/, '')}/compare/${prevTag}...${tag}` : null;
  const notes = `${top.body}${compare ? `\n\n**Full Changelog**: ${compare}` : ''}\n`;
  return {
    ok: true,
    errors: [],
    version: top.label,
    date: top.date,
    prefix: pre.prefix,
    prefixSource: pre.source,
    tag,
    title: tag,
    previousTag: prevTag,
    compare,
    notes
  };
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
}

// Side effects the CLI needs; tests pass stubs, everything else uses the real ones.
const realDeps = {
  git,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  cwd: () => process.cwd(),
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (argv[0] !== 'plan') {
    d.error(
      'usage: changelog-release.mjs plan [--changelog <path>] [--prefix <v|none>] [--repo-url <url>] [--notes-out <file>]'
    );
    return 2;
  }
  const file = path.resolve(arg(argv, '--changelog') ?? 'CHANGELOG.md');
  if (!d.existsSync(file)) {
    d.log(
      JSON.stringify({
        ok: false,
        errors: [fail('no-changelog', `${file} does not exist`, 'create it with cdk:write-changelog')]
      })
    );
    return 1;
  }
  const tags = (d.git(d.cwd(), ['tag', '--list']).stdout?.toString() ?? '').split('\n').filter(Boolean);
  const res = plan({
    changelog: d.readFileSync(file, 'utf8'),
    tags,
    prefix: arg(argv, '--prefix'),
    repoUrl: arg(argv, '--repo-url')
  });
  const out = arg(argv, '--notes-out');
  if (res.ok && out) {
    d.mkdirSync(path.dirname(out), { recursive: true });
    d.writeFileSync(out, res.notes);
  }
  d.log(JSON.stringify(res));
  return res.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = main(process.argv.slice(2));
