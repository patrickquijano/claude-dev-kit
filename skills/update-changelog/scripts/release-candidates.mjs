// Release candidates for update-changelog: patch, minor, and major versions from the latest release and the change types since it.
// Read-only. CLI: `candidates --latest <x.y.z|none> --types <Added,Removed,...>`, JSON on stdout.
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

/* eslint-disable-next-line security/detect-unsafe-regex -- applied to a version string only */
const CORE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+].*)?$/;

const fail = (code, message, fix) => ({ code, message, fix });

// A type is breaking when it is `Removed`, `breaking`, or a Conventional Commit type ending in `!`.
export const isBreaking = (type) => /^(removed|breaking)$/i.test(type) || /!$/.test(type);

const isAdded = (type) => /^(added|feat)$/i.test(type);

// `latest` is `x.y.z` (pre-release and build parts are dropped) or null for no release yet; `types` are the change types since it.
export function candidates({ latest = null, types = [] } = {}) {
  const list = types.map((t) => String(t).trim()).filter(Boolean);
  const breaking = list.some(isBreaking);
  const added = list.some(isAdded);
  if (latest === null || latest === undefined || latest === '')
    return {
      ok: true,
      errors: [],
      latest: null,
      candidates: [
        { bump: 'initial', version: '0.1.0', reason: 'first release, pre-1.0' },
        { bump: 'initial', version: '1.0.0', reason: 'first release, stable' }
      ]
    };
  const m = CORE.exec(String(latest));
  if (!m)
    return {
      ok: false,
      errors: [fail('invalid-version', `"${latest}" is not an x.y.z version`, 'pass the latest released version')]
    };
  const [major, minor, patch] = [+m[1], +m[2], +m[3]];
  const zero = major === 0;
  const bumps = {
    major: `${major + 1}.0.0`,
    minor: `${major}.${minor + 1}.0`,
    patch: `${major}.${minor}.${patch + 1}`
  };
  // Major 0 shifts each level down one: breaking -> minor, everything else -> patch.
  const picked = [];
  if (breaking)
    picked.push(
      zero
        ? { bump: 'minor', reason: 'breaking or Removed change while the major version is 0' }
        : { bump: 'major', reason: 'breaking or Removed change' }
    );
  if (added && !zero) picked.push({ bump: 'minor', reason: 'Added change' });
  picked.push({ bump: 'patch', reason: zero && added ? 'Added change while the major version is 0' : 'other changes' });
  const out = picked.map((c) => ({ bump: c.bump, version: bumps[c.bump], reason: c.reason }));
  return { ok: true, errors: [], latest: `${major}.${minor}.${patch}`, candidates: out };
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
}

// Side effects the CLI needs; tests pass stubs, everything else uses the real ones.
const realDeps = {
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const latest = arg(argv, '--latest');
  if (argv[0] !== 'candidates' || latest === undefined) {
    d.error('usage: release-candidates.mjs candidates --latest <x.y.z|none> --types <Added,Removed,...>');
    return 2;
  }
  const types = (arg(argv, '--types') ?? '').split(',');
  const res = candidates({ latest: latest === 'none' ? null : latest, types });
  d.log(JSON.stringify(res));
  return res.ok ? 0 : 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'release-candidates');
