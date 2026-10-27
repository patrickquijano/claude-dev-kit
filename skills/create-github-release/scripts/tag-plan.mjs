// Tag candidates for create-github-release: the tag convention, the latest stable version, and the next patch, minor, major, and pre-release tags, each flagged with whether the changelog has its section.
// CLI: reads `{tags, releases, commits, labels, changelogVersions, today}` JSON on stdin; JSON on stdout, exit 0 = a plan and 1 = a stop code. No git or network access.
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

// Official SemVer 2.0.0 regex (semver.org).
/* eslint-disable security/detect-unsafe-regex -- the official pattern, applied to a version string only */
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
/* eslint-enable security/detect-unsafe-regex */
const TODAY = /^(\d{4})-(\d{2})-(\d{2})$/;

// True for a `YYYY-MM-DD` string whose month is 1-12 and day is 1-31.
function validDay(today) {
  const t = TODAY.exec(today ?? '');
  return Boolean(t) && +t[2] >= 1 && +t[2] <= 12 && +t[3] >= 1 && +t[3] <= 31;
}

const fail = (code, message, fix) => ({ ok: false, code, message, fix });

// `{tag, prefix, version, major, minor, patch, pre}` for a SemVer tag with an optional `v`, else null.
export function parseTag(tag) {
  const m = /^(v?)(.+)$/.exec(String(tag ?? '').trim());
  const s = m && SEMVER.exec(m[2]);
  if (!s) return null;
  return {
    tag: m[0],
    prefix: m[1],
    version: m[2].split('+')[0],
    major: +s[1],
    minor: +s[2],
    patch: +s[3],
    pre: s[4] ? s[4].split('.') : []
  };
}

// SemVer precedence: negative when `a` is lower than `b`; a version with a pre-release is lower than the same without.
export function compareTags(a, b) {
  for (const k of ['major', 'minor', 'patch']) if (a[k] !== b[k]) return a[k] - b[k];
  if (!a.pre.length || !b.pre.length) return b.pre.length - a.pre.length;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i += 1) {
    const [x, y] = [a.pre[i], b.pre[i]];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const [nx, ny] = [/^\d+$/.test(x), /^\d+$/.test(y)];
    if (nx && ny) return +x - +y;
    if (nx !== ny) return nx ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

// The convention of the existing tags: `prefix` (`v`, empty, or null when mixed or no tags), `scheme` (`semver` or `calver`), and the pre-release `style` (`rc` by default).
export function detectConvention(tags) {
  const parsed = tags.map(parseTag).filter(Boolean);
  const prefixes = new Set(parsed.map((p) => p.prefix));
  const calver = parsed.length > 0 && parsed.every((p) => p.major >= 2000 && p.major < 3000);
  const style = parsed.find((p) => p.pre.length && /^[a-z]/i.test(p.pre[0]))?.pre[0] ?? 'rc';
  return {
    prefix: prefixes.size === 1 ? [...prefixes][0] : null,
    scheme: calver ? 'calver' : 'semver',
    style,
    parsed: parsed.length
  };
}

// The highest non-pre-release tag, or null.
export function latestStable(tags) {
  const stable = tags
    .map(parseTag)
    .filter((p) => p && !p.pre.length)
    .sort(compareTags);
  return stable.at(-1) ?? null;
}

// The type and breaking flag of a Conventional Commits header (`type(scope)!: subject`), or null.
function conventionalType(header) {
  const colon = header.indexOf(': ');
  if (colon < 0) return null;
  let head = header.slice(0, colon);
  const breaking = head.endsWith('!');
  if (breaking) head = head.slice(0, -1);
  const paren = head.indexOf('(');
  if (paren >= 0 && !head.endsWith(')')) return null;
  const name = (paren < 0 ? head : head.slice(0, paren)).toLowerCase();
  return /^[a-z]+$/.test(name) ? { name, breaking } : null;
}

// Counts of breaking, feat, fix, and other commit subjects (Conventional Commits headers; `!:` or a BREAKING CHANGE line is breaking), plus the count per label.
export function signals(commits, labels = []) {
  const out = { breaking: 0, feat: 0, fix: 0, other: 0, labels: {} };
  for (const c of commits) {
    const text = String(c);
    const type = conventionalType(text.split('\n')[0]);
    if (type?.breaking || /^BREAKING[ -]CHANGE:/m.test(text)) out.breaking += 1;
    else if (type?.name === 'feat') out.feat += 1;
    else if (type?.name === 'fix') out.fix += 1;
    else out.other += 1;
  }
  for (const l of labels) out.labels[l] = (out.labels[l] ?? 0) + 1;
  return out;
}

// The next pre-release of `base` after the highest existing pre-release tag of that base: `rc.1` → `rc.2`, none → `<style>.1`.
function nextPre(base, tags, style) {
  const same = tags
    .map(parseTag)
    .filter((p) => p?.pre.length && [p.major, p.minor, p.patch].join('.') === base)
    .sort(compareTags)
    .at(-1);
  if (!same) return `${base}-${style}.1`;
  const last = same.pre.at(-1);
  if (/^\d+$/.test(last)) return `${base}-${[...same.pre.slice(0, -1), +last + 1].join('.')}`;
  return `${base}-${same.pre.join('.')}.1`;
}

// CalVer `YYYY.MM.MICRO` for `today` (`YYYY-MM-DD`): the micro goes up when the latest tag is in the same month, else it restarts at 0. Month padding follows the latest tag.
function nextCalver(latest, today) {
  const t = TODAY.exec(today ?? '');
  if (!t) return null;
  const month = latest && /^\d{4}\.0\d/.test(latest.version) ? t[2] : String(+t[2]);
  const sameMonth = latest && latest.major === +t[1] && latest.minor === +t[2];
  return `${t[1]}.${month}.${sameMonth ? latest.patch + 1 : 0}`;
}

// Candidates `{kind, version, tag, hasSection}`; `first` kinds when there is no stable tag, `calver` for CalVer repos.
export function candidates({ tags, convention, changelogVersions = [], today }) {
  const latest = latestStable(tags);
  const prefix = convention.prefix ?? 'v';
  const versions = [];
  if (convention.scheme === 'calver') {
    const next = nextCalver(latest, today);
    if (next) versions.push({ kind: 'calver', version: next });
  } else if (!latest) {
    versions.push({ kind: 'first', version: '0.1.0' }, { kind: 'first', version: '1.0.0' });
  } else {
    const { major, minor, patch } = latest;
    const minorBase = `${major}.${minor + 1}.0`;
    versions.push(
      { kind: 'patch', version: `${major}.${minor}.${patch + 1}` },
      { kind: 'minor', version: minorBase },
      { kind: 'major', version: `${major + 1}.0.0` },
      { kind: 'prerelease', version: nextPre(minorBase, tags, convention.style) }
    );
  }
  return versions.map((c) => ({
    ...c,
    tag: `${prefix}${c.version}`,
    hasSection: changelogVersions.includes(c.version)
  }));
}

// The whole plan for the tag question; a stop code when the input is not usable.
export function planTags(input) {
  const { tags, commits = [], labels = [], changelogVersions = [], today } = input ?? {};
  if (!Array.isArray(tags) || !Array.isArray(commits) || !Array.isArray(labels) || !Array.isArray(changelogVersions))
    return fail('bad-input', '`tags`, `commits`, `labels`, `changelogVersions` must be arrays', 'pass the JSON shape');
  const names = tags.filter((t) => typeof t === 'string' && t);
  const convention = detectConvention(names);
  if (convention.scheme === 'calver' && !validDay(today))
    return fail('bad-today', '`today` is not YYYY-MM-DD', 'pass today as YYYY-MM-DD');
  const latest = latestStable(names);
  return {
    ok: true,
    convention: { prefix: convention.prefix, scheme: convention.scheme, style: convention.style },
    latestStable: latest ? latest.tag : null,
    candidates: candidates({ tags: names, convention, changelogVersions, today }),
    signals: signals(commits, labels)
  };
}

const realDeps = {
  readStdin: () => readFileSync(0, 'utf8'),
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (argv.length > 0) {
    d.error('usage: tag-plan.mjs < <json file>');
    return 2;
  }
  let input;
  try {
    input = JSON.parse(d.readStdin());
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err;
    d.log(JSON.stringify(fail('bad-json', 'stdin is not valid JSON', 'pass the JSON shape')));
    return 1;
  }
  const res = planTags(input);
  d.log(JSON.stringify(res));
  return res.ok ? 0 : 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'tag-plan');
