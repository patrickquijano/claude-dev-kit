// Resolves the highest stable tag of a container image: `resolve-image-tag.mjs <image> [variant]`.
// Prints {"image","tag","method","tried"}; exit 0 resolved, 2 unresolved, 1 bad usage.
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

const TIMEOUT = 30_000;
const MAX_PAGES = 10;
const HUB_HOSTS = new Set(['docker.io', 'index.docker.io', 'registry-1.docker.io']);
const REGISTRIES = new Set([
  'ghcr.io',
  'quay.io',
  'gcr.io',
  'registry.gitlab.com',
  'mcr.microsoft.com',
  'public.ecr.aws',
  'registry.k8s.io'
]);
const IMAGE = /^[a-z0-9][a-z0-9./_-]*$/;
const VARIANT = /^[a-z0-9._-]+$/;
const PRERELEASE = /rc|alpha|beta|nightly|dev|preview/i;
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

const isHigher = (a, b) => {
  const i = a.findIndex((n, k) => n !== b[k]);
  return i >= 0 && a[i] > b[i];
};

// Highest stable `X.Y.Z` (or `X.Y.Z-<variant>`) by numeric comparison; null when none matches.
export function pickTag(tags, variant) {
  const suffix = variant ? `-${variant}` : '';
  let best = null;
  for (const tag of tags) {
    if (typeof tag !== 'string' || PRERELEASE.test(tag)) continue;
    if (!tag.endsWith(suffix)) continue;
    const match = SEMVER.exec(suffix ? tag.slice(0, -suffix.length) : tag);
    if (!match) continue;
    const nums = match.slice(1).map(Number);
    if (!best || isHigher(nums, best.nums)) best = { tag, nums };
  }
  return best ? best.tag : null;
}

// Parses a tool's stdout into tag names: skopeo prints JSON `Tags`, Docker Hub JSON `results[].name`, a registry JSON `tags`, the rest one tag per line.
export function tagLines(method, stdout) {
  const text = String(stdout ?? '');
  if (method === 'skopeo' || method === 'docker-hub-api' || method === 'registry-api') {
    try {
      const json = JSON.parse(text);
      const list =
        method === 'skopeo' ? json?.Tags : method === 'registry-api' ? json?.tags : json?.results?.map((r) => r?.name);
      return Array.isArray(list) ? list : [];
    } catch (err) {
      if (err instanceof SyntaxError) return [];
      throw err;
    }
  }
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

// Splits an image into its registry host and repository; a first segment with a dot is a host, Docker Hub names get `library/` when official.
export function parseImage(image) {
  const parts = image.split('/');
  let registry = 'docker.io';
  if (parts.length > 1 && parts[0].includes('.')) {
    registry = HUB_HOSTS.has(parts[0]) ? 'docker.io' : parts[0];
    parts.shift();
  }
  if (registry === 'docker.io' && parts.length === 1) parts.unshift('library');
  return { registry, repo: parts.join('/') };
}

// True for the registry hosts queried through the OCI API: the fixed set plus `<region>.gcr.io` and `<region>-docker.pkg.dev`.
export function isAllowedRegistry(host) {
  return REGISTRIES.has(host) || /^[a-z0-9-]+\.gcr\.io$/.test(host) || /^[a-z0-9-]+-docker\.pkg\.dev$/.test(host);
}

// Parses a `WWW-Authenticate: Bearer realm="…",service="…",scope="…"` header; null unless Bearer with an https realm.
export function parseChallenge(header) {
  const match = /^Bearer\s+(.+)$/i.exec(String(header ?? '').trim());
  if (!match) return null;
  const params = Object.fromEntries([...match[1].matchAll(/(\w+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));
  try {
    if (new URL(params.realm).protocol !== 'https:') return null;
  } catch (err) {
    if (err instanceof TypeError) return null;
    throw err;
  }
  return { realm: params.realm, service: params.service, scope: params.scope };
}

// Same-host `rel="next"` URL from a Link header, or null.
function nextPage(link, current) {
  const match = /<([^>]+)>\s*;\s*rel="?next"?/i.exec(String(link ?? ''));
  if (!match) return null;
  try {
    const next = new URL(match[1], current);
    return next.protocol === 'https:' && next.host === current.host ? next : null;
  } catch (err) {
    if (err instanceof TypeError) return null;
    throw err;
  }
}

// Anonymous OCI `tags/list` for an allowlisted registry, following a bearer challenge and same-host pagination; null on any failure.
async function registryTags(registry, repo, d) {
  const get = (url, headers) => d.fetch(String(url), { headers, signal: AbortSignal.timeout(TIMEOUT) });
  try {
    let url = new URL(`https://${registry}/v2/${repo}/tags/list?n=1000`);
    let headers = {};
    const tags = [];
    for (let page = 0; url && page < MAX_PAGES; page++) {
      let res = await get(url, headers);
      if (res.status === 401 && !headers.Authorization) {
        const challenge = parseChallenge(res.headers?.get('www-authenticate'));
        if (!challenge) return null;
        const auth = new URL(challenge.realm);
        if (challenge.service) auth.searchParams.set('service', challenge.service);
        auth.searchParams.set('scope', challenge.scope || `repository:${repo}:pull`);
        const tokenRes = await get(auth, {});
        if (!tokenRes.ok) return null;
        const body = JSON.parse(await tokenRes.text());
        const token = body?.token ?? body?.access_token;
        if (typeof token !== 'string' || !token) return null;
        headers = { Authorization: `Bearer ${token}` };
        res = await get(url, headers);
      }
      if (!res.ok) return null;
      tags.push(...tagLines('registry-api', await res.text()));
      url = nextPage(res.headers?.get('link'), url);
    }
    return tags;
  } catch (err) {
    if (err instanceof TypeError || err instanceof SyntaxError || err?.name === 'TimeoutError') return null;
    throw err;
  }
}

// Docker Hub `tags` pages, following the same-host `next` URL; null on any failure so a partial list never picks a stale tag.
async function hubTags(repo, variant, d) {
  let url = `https://hub.docker.com/v2/repositories/${repo}/tags?page_size=100&name=${variant || '.'}`;
  const tags = [];
  try {
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const res = await d.fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
      if (!res.ok) return null;
      const text = await res.text();
      tags.push(...tagLines('docker-hub-api', text));
      const next = JSON.parse(text)?.next;
      url = typeof next === 'string' && next.startsWith('https://hub.docker.com/') ? next : null;
    }
    return tags;
  } catch (err) {
    if (err instanceof TypeError || err instanceof SyntaxError || err?.name === 'TimeoutError') return null;
    throw err;
  }
}

// Side effects the CLI needs; tests pass stubs.
const realDeps = {
  run: (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', timeout: TIMEOUT }),
  fetch: (url, init) => fetch(url, init),
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export async function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (argv.length < 1 || argv.length > 2) {
    d.error('usage: resolve-image-tag.mjs <image> [variant]');
    return 1;
  }
  const [image, variant = ''] = argv;
  if (!IMAGE.test(image) || image.includes('..')) {
    d.error('invalid image name');
    return 1;
  }
  if (variant && !VARIANT.test(variant)) {
    d.error('invalid variant');
    return 1;
  }

  const tried = [];
  const emit = (tag, method) => {
    d.log(JSON.stringify({ image, tag, method, tried }));
    return tag ? 0 : 2;
  };

  const cli = [
    ['crane', 'crane', ['ls', image]],
    ['skopeo', 'skopeo', ['list-tags', `docker://${image}`]],
    ['regctl', 'regctl', ['tag', 'ls', image]]
  ];
  for (const [method, cmd, args] of cli) {
    const res = d.run(cmd, args);
    if (res?.error?.code === 'ENOENT') continue;
    if (res?.error) throw res.error;
    tried.push(method);
    if (res.status !== 0) continue;
    const tag = pickTag(tagLines(method, res.stdout), variant);
    if (tag) return emit(tag, method);
  }

  const { registry, repo } = parseImage(image);
  if (registry === 'docker.io') {
    if (repo.split('/').length === 2) {
      tried.push('docker-hub-api');
      const tag = pickTag((await hubTags(repo, variant, d)) ?? [], variant);
      if (tag) return emit(tag, 'docker-hub-api');
    }
  } else if (isAllowedRegistry(registry)) {
    tried.push('registry-api');
    const tag = pickTag((await registryTags(registry, repo, d)) ?? [], variant);
    if (tag) return emit(tag, 'registry-api');
  }
  return emit(null, null);
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'resolve-image-tag');
