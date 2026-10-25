// Read-only Docker Hub tag resolver for build-dockerfile: the highest stable exact tag for an image, runtime major.minor, and variant.
// CLI: `resolve-tag.mjs --image <repo | namespace/repo> [--runtime <major.minor>] --variant <suffix | ubuntu>`; one GET per page, JSON on stdout.
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

export const MAX_PAGES = 10;
const NAME_PART = /^[a-z0-9][a-z0-9._-]*$/;
const DIGITS = /^\d+$/;
const VARIANT = /^[a-z0-9][a-z0-9.-]*$/;

const isImage = (s) =>
  typeof s === 'string' && s.split('/').length <= 2 && s.split('/').every((p) => NAME_PART.test(p));
const isRuntime = (s) => typeof s === 'string' && s.split('.').length <= 2 && s.split('.').every((p) => DIGITS.test(p));
const isDotted = (s) => s.split('.').length >= 2 && s.split('.').every((p) => DIGITS.test(p));

const toNums = (v) => v.split('.').map(Number);

function compare(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

// Allowlist from the practices pin item: `<digits>(.<digits>)+-<variant>`, or `<digits>.<digits>` for `ubuntu`; pre-release forms never match.
function versionOf(name, variant) {
  if (variant === 'ubuntu') return isDotted(name) && name.split('.').length === 2 ? name : null;
  const suffix = `-${variant}`;
  if (!name.endsWith(suffix)) return null;
  const version = name.slice(0, -suffix.length);
  return isDotted(version) ? version : null;
}

// Highest tag whose version starts with `runtime` (when given) and matches the allowlist for `variant`; numeric comparison.
export function pickTag({ names, runtime, variant } = {}) {
  if (!Array.isArray(names)) return { ok: false, error: 'names must be an array' };
  if (typeof variant !== 'string' || !VARIANT.test(variant)) return { ok: false, error: 'invalid variant' };
  if (runtime !== undefined && !isRuntime(String(runtime))) return { ok: false, error: 'invalid runtime' };
  const prefix = runtime === undefined ? [] : toNums(String(runtime));
  let best = null;
  for (const name of names) {
    if (typeof name !== 'string') continue;
    const version = versionOf(name, variant);
    if (!version) continue;
    const nums = toNums(version);
    if (prefix.some((n, i) => nums[i] !== n)) continue;
    if (!best || compare(nums, best.nums) > 0) best = { tag: name, nums };
  }
  return best ? { ok: true, tag: best.tag } : { ok: false, error: 'no matching stable tag' };
}

// Pages through the Docker Hub tags API (`next` links) up to MAX_PAGES; `fetchJson(url)` returns the parsed page.
export async function resolveTag({ image, runtime, variant }, fetchJson) {
  if (!isImage(image)) return { ok: false, error: 'invalid image' };
  if (typeof variant !== 'string' || !VARIANT.test(variant)) return { ok: false, error: 'invalid variant' };
  if (runtime !== undefined && !isRuntime(runtime)) return { ok: false, error: 'invalid runtime' };
  const repo = image.includes('/') ? image : `library/${image}`;
  const filter = runtime === undefined ? '' : `&name=${runtime}`;
  const names = [];
  let url = `https://hub.docker.com/v2/namespaces/${repo.split('/')[0]}/repositories/${repo.split('/')[1]}/tags?page_size=100${filter}`;
  for (let page = 0; url; page += 1) {
    if (page >= MAX_PAGES) return { ok: false, error: `page cap of ${MAX_PAGES} reached with no match` };
    const body = await fetchJson(url);
    if (!Array.isArray(body?.results)) return { ok: false, error: 'unexpected tags response' };
    names.push(...body.results.map((r) => r?.name));
    const found = pickTag({ names, runtime, variant });
    if (found.ok && !body.next) return found;
    url = typeof body.next === 'string' && body.next.startsWith('https://hub.docker.com/') ? body.next : null;
  }
  return pickTag({ names, runtime, variant });
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
}

// Side effects the CLI needs; tests pass stubs.
const realDeps = {
  fetchJson: async (url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`GET ${url} failed: HTTP ${res.status}`);
    return res.json();
  },
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export async function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const known = new Set(['--image', '--runtime', '--variant']);
  if (
    argv.length % 2 ||
    argv.some((a, i) => i % 2 === 0 && !known.has(a)) ||
    !arg(argv, '--image') ||
    !arg(argv, '--variant')
  ) {
    d.error(
      'usage: resolve-tag.mjs --image <repo | namespace/repo> [--runtime <major.minor>] --variant <suffix | ubuntu>'
    );
    return 2;
  }
  const result = await resolveTag(
    { image: arg(argv, '--image'), runtime: arg(argv, '--runtime'), variant: arg(argv, '--variant') },
    d.fetchJson
  );
  d.log(JSON.stringify(result));
  return result.ok ? 0 : 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'resolve-tag');
