// Tag picking for build-github-workflows: the highest stable action tag, Docker image tag, or runner label from a list on stdin.
// CLI: `action` | `image [--variant <name>]` | `runner [--arch x64|arm64]`; whitespace-separated items on stdin, JSON on stdout.
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

const fail = (code, message, fix) => ({ ok: false, errors: [{ code, message, fix }] });

// Action releases: a full `vX.Y.Z` or `X.Y.Z` only, so prerelease suffixes (-rc, -beta, ...) and floating majors (`v4`) never match.
const ACTION_TAG = /^v?\d+\.\d+\.\d+$/;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const numbers = (tag) => tag.match(/\d+/g).map(Number);

// Numeric segment-wise comparison of the leading digits, never string order.
export function compareVersions(a, b) {
  const x = numbers(a);
  const y = numbers(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

const highest = (tags) =>
  tags.reduce((best, t) => (best === undefined || compareVersions(t, best) > 0 ? t : best), undefined);

// Highest stable `vX.Y.Z` tag; null when none qualifies.
export function pickActionTag(tags) {
  return highest(tags.filter((t) => ACTION_TAG.test(t))) ?? null;
}

// Allowlist `^<digits>(.<digits>)+-<variant>$` (or without the variant); excludes -rc, -alpha, -beta, -nightly, and every other suffix.
export function pickImageTag(tags, variant) {
  const suffix = variant ? `-${escapeRe(variant)}` : '';
  // eslint-disable-next-line security/detect-non-literal-regexp -- the variant is escaped above
  const allow = new RegExp(`^\\d+(\\.\\d+)+${suffix}$`);
  return highest(tags.filter((t) => allow.test(t))) ?? null;
}

// Highest `ubuntu-YY.MM` (or `ubuntu-YY.MM-arm` for arm64) label and the highest LTS (`.04`) one; null when none qualifies.
export function pickRunnerLabel(labels, arch = 'x64') {
  const form = arch === 'arm64' ? /^ubuntu-\d{2}\.\d{2}-arm$/ : /^ubuntu-\d{2}\.\d{2}$/;
  const valid = labels.filter((l) => form.test(l));
  return { tag: highest(valid) ?? null, lts: highest(valid.filter((l) => /\.04(-arm)?$/.test(l))) ?? null };
}

const realDeps = {
  readStdin: () => readFileSync(0, 'utf8'),
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const [kind, ...rest] = argv;
  const vi = rest.indexOf('--variant');
  const variant = vi === -1 ? undefined : rest[vi + 1];
  const ai = rest.indexOf('--arch');
  const arch = ai === -1 ? 'x64' : rest[ai + 1];
  if (
    !['action', 'image', 'runner'].includes(kind) ||
    (vi !== -1 && !variant) ||
    (ai !== -1 && arch !== 'x64' && arch !== 'arm64')
  ) {
    d.error(
      'usage: resolve-versions.mjs action | image [--variant <name>] | runner [--arch x64|arm64]  (tags on stdin)'
    );
    return 2;
  }
  const tags = d.readStdin().split(/\s+/).filter(Boolean);
  if (kind === 'runner') {
    const { tag: label, lts } = pickRunnerLabel(tags, arch);
    if (!label) {
      d.log(
        JSON.stringify(
          fail('no-stable-tag', `no ${arch} runner label among ${tags.length} labels`, 'return the item as Unresolved')
        )
      );
      return 1;
    }
    d.log(JSON.stringify({ ok: true, tag: label, lts }));
    return 0;
  }
  const tag = kind === 'action' ? pickActionTag(tags) : pickImageTag(tags, variant);
  if (!tag) {
    d.log(
      JSON.stringify(
        fail('no-stable-tag', `no stable ${kind} tag among ${tags.length} tags`, 'return the item as Unresolved')
      )
    );
    return 1;
  }
  d.log(JSON.stringify({ ok: true, tag }));
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'resolve-versions');
