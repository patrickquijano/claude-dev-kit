// Derives the release tag from the committed CHANGELOG.md and the existing tags: the first released `## [x.y.z]` heading (SemVer, real date, not YANKED, not a pre-release) plus a `v` or empty prefix.
// CLI: `[--prefix v|none] [--ref <ref>]` (default `HEAD`), run in the repo root; JSON on stdout, exit 0 = a tag and 1 = a stop code. Reads `git show <ref>:CHANGELOG.md` and `git tag --list` only.
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
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

const fail = (code, message, fix) => ({ ok: false, code, message, fix });

const validDate = (s) => {
  const m = DATE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
};

// The first `## [x]` heading outside code fences that is not `Unreleased`; null when there is none.
export function firstRelease(changelog) {
  let fence = null;
  for (const line of changelog.replace(/\r\n/g, '\n').split('\n')) {
    const f = /^\s*(```+|~~~+)/.exec(line);
    if (f) fence = fence ? (f[1][0] === fence[0] ? null : fence) : f[1];
    const h = !fence && HEADING.exec(line);
    if (h && h[1].trim().toLowerCase() !== 'unreleased')
      return { heading: line.trim(), label: h[1].trim(), rest: h[2].trim() };
  }
  return null;
}

// `v` when every tag is `v<digit>…`, `none` when every tag starts with a digit, else null (no tags or both forms).
export function detectPrefix(tags) {
  const list = tags.filter(Boolean);
  if (!list.length) return null;
  if (list.every((t) => /^v\d/.test(t))) return 'v';
  if (list.every((t) => /^\d/.test(t))) return 'none';
  return null;
}

// `prefix` is `v`, `none`, or undefined (detect from `tags`).
export function nextTag({ changelog, tags = [], prefix }) {
  const rel = firstRelease(changelog);
  if (!rel)
    return fail('no-released-version', 'no `## [x.y.z]` release section', 'add a release section to the changelog');
  const date = /^-\s+(\S+)/.exec(rel.rest)?.[1];
  const m = SEMVER.exec(rel.label);
  if (!m || m[4] || /\[YANKED\]/i.test(rel.rest) || (date !== undefined && !validDate(date)))
    return fail('bad-heading', rel.heading, 'use `## [x.y.z] - YYYY-MM-DD` with a stable, non-yanked version');
  if (prefix !== undefined && prefix !== 'v' && prefix !== 'none')
    return fail('bad-prefix', `--prefix ${prefix}`, 'pass --prefix v or --prefix none');
  const chosen = prefix ?? detectPrefix(tags);
  if (!chosen)
    return fail('prefix-unknown', 'no clear prefix in the existing tags', 'pass --prefix v or --prefix none');
  return {
    ok: true,
    version: rel.label,
    prefix: chosen,
    prefixSource: prefix ? 'flag' : 'tags',
    tag: `${chosen === 'v' ? 'v' : ''}${rel.label}`
  };
}

function arg(argv, flag) {
  const i = argv.indexOf(flag);
  return i < 0 ? undefined : argv[i + 1];
}

// Real side effects; tests pass stubs. `changelog` returns null when `git show` fails (not committed at the ref); `tags` throws on a git failure.
const realDeps = {
  changelog(ref) {
    const r = spawnSync('git', ['show', `${ref}:CHANGELOG.md`], { encoding: 'utf8', timeout: 20000 });
    return r.error || r.status !== 0 ? null : r.stdout;
  },
  tags() {
    const r = spawnSync('git', ['tag', '--list'], { encoding: 'utf8', timeout: 20000 });
    if (r.error || r.status !== 0) throw new Error('git tag --list failed');
    return r.stdout.split('\n');
  },
  log: (text) => console.log(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const ref = arg(argv, '--ref') ?? 'HEAD';
  if (!/^[A-Za-z0-9._/-]+$/.test(ref) || ref.startsWith('-')) {
    d.log(JSON.stringify(fail('bad-ref', `--ref ${ref}`, 'pass a ref of [A-Za-z0-9._/-]')));
    return 1;
  }
  const changelog = d.changelog(ref);
  const res =
    changelog === null
      ? fail('changelog-missing', `CHANGELOG.md is not committed at ${ref}`, 'commit the changelog')
      : nextTag({ changelog, tags: d.tags(), prefix: arg(argv, '--prefix') });
  d.log(JSON.stringify(res));
  return res.ok ? 0 : 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'next-tag');
