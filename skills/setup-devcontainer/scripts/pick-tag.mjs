// Tag picker for setup-devcontainer: the newest stable `mcr.microsoft.com/devcontainers/<image>` tag for a runtime, or the highest stable semver tag of a Docker Hub tag list.
// Read-only. CLI: `--image <name> --mode <image|dockerfile> [--runtime <version>]` (one GET of the MCR tag list) or `--mode hub` (Docker Hub tag JSON on stdin); JSON on stdout.
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

// Debian codenames, oldest first; any other suffix (Ubuntu, a variant, a pre-release) is never picked.
const DEBIAN = ['buster', 'bullseye', 'bookworm', 'trixie', 'forky'];
const IMAGE_MAJOR = /^\d+$/;
const FULL_SEMVER = /^\d+\.\d+\.\d+$/;

const toNums = (v) => v.split('.').map(Number);

function compare(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

// `image` mode takes `<major>-<runtime>-<codename>`, `dockerfile` mode `<X.Y.Z>-<runtime>-<codename>`; highest version, then newest codename.
export function pickTag({ tags, runtime, mode } = {}) {
  if (!Array.isArray(tags)) return { ok: false, error: 'tags must be an array' };
  if (mode !== 'image' && mode !== 'dockerfile') return { ok: false, error: 'mode must be image or dockerfile' };
  const versionRe = mode === 'image' ? IMAGE_MAJOR : FULL_SEMVER;
  let best = null;
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    const parts = tag.split('-');
    if (parts.length !== (runtime ? 3 : 2)) continue;
    if (runtime && parts[1] !== runtime) continue;
    const codename = DEBIAN.indexOf(parts[parts.length - 1]);
    if (codename < 0 || !versionRe.test(parts[0])) continue;
    const cand = { tag, version: toNums(parts[0]), codename };
    if (
      !best ||
      compare(cand.version, best.version) > 0 ||
      (!compare(cand.version, best.version) && cand.codename > best.codename)
    )
      best = cand;
  }
  return best ? { ok: true, tag: best.tag } : { ok: false, error: 'no matching stable tag' };
}

const PLAIN_SEMVER = /^\d+\.\d+\.\d+$/;
const VARIANT_SEMVER = /^(\d+\.\d+\.\d+)-([a-z][a-z0-9.-]*)$/;
const PRERELEASE = /(^|[.-])(alpha|beta|rc|pre|preview|dev|snapshot|nightly|canary|edge|test)\d*($|[.-])/;

// Accepts the Docker Hub tags API shape `{results:[{name}]}` or a plain array of names.
const hubNames = (list) => {
  const items = Array.isArray(list) ? list : list?.results;
  if (!Array.isArray(items)) return null;
  return items.map((i) => (typeof i === 'string' ? i : i?.name)).filter((n) => typeof n === 'string');
};

// Highest plain `X.Y.Z` tag; only when none exists, the highest `X.Y.Z-<variant>` tag that is not a pre-release. Never `latest`.
export function pickHubTag(list) {
  const names = hubNames(list);
  if (!names) return { ok: false, error: 'tag list must be an array or {results:[{name}]}' };
  const highest = (cands) =>
    cands.reduce((best, c) => (!best || compare(toNums(c.version), toNums(best.version)) > 0 ? c : best), null);
  const plain = highest(names.filter((n) => PLAIN_SEMVER.test(n)).map((n) => ({ tag: n, version: n })));
  if (plain) return { ok: true, tag: plain.tag };
  const variants = names.flatMap((n) => {
    const m = VARIANT_SEMVER.exec(n);
    return m && !PRERELEASE.test(m[2]) ? [{ tag: n, version: m[1] }] : [];
  });
  const variant = highest(variants);
  return variant ? { ok: true, tag: variant.tag } : { ok: false, error: 'no stable semver tag' };
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
}

// Side effects the CLI needs; tests pass stubs, everything else uses the real ones.
const realDeps = {
  fetch: (url, init) => fetch(url, init),
  readStdin: async () => {
    let text = '';
    for await (const chunk of process.stdin) text += chunk;
    return text;
  },
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export async function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (arg(argv, '--mode') === 'hub') {
    let list;
    try {
      list = JSON.parse(await d.readStdin());
    } catch (err) {
      if (!(err instanceof SyntaxError)) throw err;
      d.error('stdin must be Docker Hub tag list JSON');
      return 2;
    }
    const picked = pickHubTag(list);
    d.log(JSON.stringify(picked));
    return picked.ok ? 0 : 1;
  }
  const image = arg(argv, '--image');
  const runtime = arg(argv, '--runtime');
  const mode = arg(argv, '--mode');
  if (!/^[a-z0-9-]+$/.test(image ?? '') || (runtime !== undefined && !/^[0-9A-Za-z.]+$/.test(runtime))) {
    d.error(
      'usage: pick-tag.mjs --image <name> --mode <image|dockerfile> [--runtime <version>] | --mode hub < tags.json'
    );
    return 2;
  }
  if (mode !== 'image' && mode !== 'dockerfile') {
    d.error(
      'usage: pick-tag.mjs --image <name> --mode <image|dockerfile> [--runtime <version>] | --mode hub < tags.json'
    );
    return 2;
  }
  const url = `https://mcr.microsoft.com/v2/devcontainers/${image}/tags/list`;
  const res = await d.fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) {
    d.log(JSON.stringify({ ok: false, error: `tag list request failed (${res.status})`, source: url }));
    return 1;
  }
  const body = await res.json();
  const picked = pickTag({ tags: body?.tags, runtime, mode });
  d.log(JSON.stringify({ ...picked, source: url }));
  return picked.ok ? 0 : 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'pick-tag');
