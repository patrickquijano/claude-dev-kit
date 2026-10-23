// Setup helper for cdk:scan-sonarqube: stack detection, and image tag lookup with a daily cache.
// CLI: `detect --root <dir>`, `tags --stack <cli|maven|gradle> [--jdk <n>]`; JSON on stdout.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
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

// An LTS the scanner runs on that compiles older releases via --release.
const DEFAULT_JDK = 21;
const MIN_JDK = 17;
const NETWORK_TIMEOUT_MS = 15_000;
const GIT_TIMEOUT_MS = 30_000;

const CLI_MARKERS = new Set([
  'package.json',
  'composer.json',
  'go.mod',
  'pyproject.toml',
  'requirements.txt',
  'Gemfile'
]);

// Generated or third-party directories per stack (`flow.md` `## Exclusions`); `cli` covers every language list.
const STACK_DIRS = {
  maven: ['target'],
  gradle: ['build', '.gradle', 'out'],
  cli: [
    ...['node_modules', 'dist', 'build', 'coverage', '.next', '.nuxt', '.angular', '.turbo', 'out', 'storybook-static'],
    ...['vendor', 'storage', 'bootstrap/cache', 'public/build', 'public/hot', 'var/cache', 'var/log'],
    ...['.venv', 'venv', 'env', '__pycache__', '.tox', '.mypy_cache', '.pytest_cache', '.ruff_cache'],
    ...['site-packages', 'staticfiles', 'tmp', 'log', 'public/assets', 'public/packs']
  ]
};

const SCANNERS = {
  maven: { scanner: 'maven', scanCommand: 'scan-maven' },
  gradle: { scanner: 'gradle', scanCommand: 'scan-gradle' },
  cli: { scanner: 'scanner-cli', scanCommand: 'scan-cli' }
};

// Parses `key=value` lines of a .properties file, with comments and trailing-backslash continuations.
export function parseProperties(text) {
  const props = new Map();
  const lines = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line || line[0] === '#' || line[0] === '!') continue;
    while (line.endsWith('\\')) {
      line = line.slice(0, -1);
      if (i + 1 < lines.length) line += lines[++i].trim();
    }
    const m = /^([^=:\s]+)\s*[=:]?\s*(.*)$/.exec(line);
    if (m) props.set(m[1], m[2].trim());
  }
  return props;
}

// Major Java version of a value such as `17`, `1.8`, or `1_8`; null when it is not a version number.
export function javaVersion(value) {
  const parts = String(value ?? '')
    .trim()
    .replace(/_/g, '.')
    .split('.');
  if (!parts.every((p) => /^\d+$/.test(p))) return null;
  const major = parts[0] === '1' && parts.length > 1 ? Number(parts[1]) : Number(parts[0]);
  return major > 0 ? major : null;
}

const MAVEN_JDK = [
  /<maven\.compiler\.release>\s*([\d._]+)\s*</,
  /<maven\.compiler\.source>\s*([\d._]+)\s*</,
  /<java\.version>\s*([\d._]+)\s*</,
  /<release>\s*([\d._]+)\s*</
];
const GRADLE_JDK = [
  /JavaLanguageVersion\.of\(\s*(\d+)\s*\)/,
  /sourceCompatibility\s*=?\s*(?:JavaVersion\.VERSION_)?['"]?([\d._]+)/,
  /jvmToolchain\(\s*(\d+)\s*\)/
];

// First Java version found in the build files, in pattern order; null when none.
function detectJdk(texts, patterns) {
  for (const re of patterns) {
    for (const text of texts) {
      const v = javaVersion(re.exec(text)?.[1]);
      if (v) return v;
    }
  }
  return null;
}

const depthOf = (file) => file.split('/').length - 1;

function classify(file) {
  const base = path.posix.basename(file);
  if (base === 'pom.xml') return 'maven';
  if (base.startsWith('build.gradle')) return 'gradle';
  if (CLI_MARKERS.has(base)) return 'cli';
  if (base.endsWith('.sln') || base.endsWith('.csproj')) return 'dotnet';
  return null;
}

// Root markers win, then the shallowest; a build tool wins over the other markers.
function pickStack(files) {
  const found = files.map((file) => ({ file, kind: classify(file), depth: depthOf(file) })).filter((m) => m.kind);
  const shallowest = (list) => list.filter((m) => m.depth === Math.min(...list.map((x) => x.depth)));
  const build = found.filter((m) => m.kind === 'maven' || m.kind === 'gradle');
  if (build.length) {
    const top = shallowest(build);
    const kinds = [...new Set(top.map((m) => m.kind))];
    if (kinds.length > 1) return { ask: ['maven', 'gradle'] };
    return { stack: kinds[0], marker: top[0].file };
  }
  if (files.some((f) => f.endsWith('.java'))) return { stop: 'Java without Maven or Gradle needs sonar.java.binaries' };
  const cli = found.filter((m) => m.kind === 'cli');
  if (cli.length) return { stack: 'cli', marker: shallowest(cli)[0].file };
  if (found.length) return { stop: 'unsupported stack: .NET needs the .NET scanner' };
  return { stop: 'no supported stack detected' };
}

// Paths marked linguist-generated or linguist-vendored in .gitattributes, as exclusion globs.
function generatedPaths(text) {
  const out = [];
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line[0] === '#') continue;
    const [pattern, ...attrs] = line.split(/\s+/);
    const marked = attrs.some((a) => {
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded patterns applied to short repo or registry strings
      const m = /^linguist-(?:generated|vendored)(?:=(\S+))?$/.exec(a);
      return Boolean(m) && m[1] !== 'false';
    });
    if (!marked) continue;
    let p = pattern.replace(/^\//, '');
    if (!pattern.includes('/')) p = `**/${p}`;
    if (p.endsWith('/')) p += '**';
    out.push(p);
  }
  return out;
}

const splitList = (value) =>
  String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// Detects key, stack, scanner, JDK, and exclusions from the tracked files of `root`; makes no network call.
export function detect({ root } = {}, deps = {}) {
  if (!root) throw new Error('--root is required');
  const d = { ...realDeps, ...deps };
  const dir = path.resolve(root);
  const files = d.git(['ls-files', '-z'], dir).split('\0').filter(Boolean);
  const props = parseProperties(d.readText(path.join(dir, 'sonar-project.properties')));
  const key =
    props.get('sonar.projectKey') ||
    path
      .basename(dir)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');
  const pick = pickStack(files);
  const read = (file) => d.readText(path.join(dir, file));
  let stop = pick.stop;
  if (pick.stack === 'gradle') {
    const carriers = files.filter(
      (f) => /^(?:build|settings)\.gradle/.test(path.posix.basename(f)) || f.endsWith('.toml')
    );
    if (!carriers.some((f) => read(f)?.includes('org.sonarqube'))) stop = 'build does not apply org.sonarqube';
  }
  const stack = stop ? null : (pick.stack ?? null);
  const where = pick.marker ? path.posix.dirname(pick.marker) : '.';
  let jdk = null;
  if (stack === 'maven') jdk = detectJdk([read(pick.marker) ?? ''], MAVEN_JDK);
  if (stack === 'gradle') {
    const builds = files.filter(
      (f) => path.posix.dirname(f) === where && path.posix.basename(f).startsWith('build.gradle')
    );
    jdk = detectJdk(
      builds.map((f) => read(f) ?? ''),
      GRADLE_JDK
    );
  }
  if (stack === 'maven' || stack === 'gradle') jdk = jdk >= MIN_JDK ? jdk : DEFAULT_JDK;
  const bases = [...new Set([dir, path.join(dir, where)])];
  const excluded = stack ? STACK_DIRS[stack].filter((n) => bases.some((b) => d.existsSync(path.join(b, n)))) : [];
  const exclusions = [
    ...new Set([
      ...splitList(props.get('sonar.exclusions')),
      '**/.scannerwork/**',
      '**/.git/**',
      ...excluded.map((n) => `**/${n}/**`),
      ...generatedPaths(read('.gitattributes'))
    ])
  ].join(',');
  const result = { key, stack, scanner: null, scanCommand: null, jdk, exclusions, excluded };
  if (stack) Object.assign(result, SCANNERS[stack]);
  if (stop) result.stop = stop;
  if (pick.ask) result.ask = pick.ask;
  return result;
}

// Where each image tag comes from: the Docker Hub listing, the tag part before `suffix`, and the shape that part must have.
function tagSource(stack, jdk) {
  const hub = 'https://hub.docker.com/v2/repositories';
  if (stack === 'maven')
    return {
      url: `${hub}/library/maven/tags?page_size=100&name=eclipse-temurin-${jdk}`,
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded patterns applied to short repo or registry strings
      core: /^\d+(\.\d+){2}$/,
      suffix: `-eclipse-temurin-${jdk}`
    };
  if (stack === 'gradle')
    return {
      url: `${hub}/library/gradle/tags?page_size=100&name=jdk${jdk}`,
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded patterns applied to short repo or registry strings
      core: /^\d+(\.\d+){1,2}$/,
      suffix: `-jdk${jdk}`
    };
  if (stack === 'server')
    return {
      url: `${hub}/library/sonarqube/tags?page_size=100&name=-community`,
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded patterns applied to short repo or registry strings
      core: /^\d+(\.\d+){3}$/,
      suffix: '-community'
    };
  return {
    url: `${hub}/sonarsource/sonar-scanner-cli/tags?page_size=100`,
    // eslint-disable-next-line security/detect-unsafe-regex -- bounded patterns applied to short repo or registry strings
    core: /^\d+(\.\d+){3}_\d+(\.\d+){2}$/,
    suffix: ''
  };
}

function compareNumeric(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

// Highest tag of the listing that matches the source shape; empty string when none.
function latestTag(listing, { core, suffix }) {
  let best = '';
  let bestNums = [];
  for (const m of String(listing).matchAll(/"name": ?"([^"]+)"/g)) {
    const name = m[1];
    if (!name.endsWith(suffix)) continue;
    const head = name.slice(0, name.length - suffix.length);
    if (!core.test(head)) continue;
    const nums = head.split(/[._]/).map(Number);
    if (!best || compareNumeric(nums, bestNums) > 0) {
      best = name;
      bestNums = nums;
    }
  }
  return best;
}

function readCache(d, file) {
  const text = d.readText(file);
  if (text === null) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    if (err instanceof SyntaxError) return {};
    throw err;
  }
}

// Today's cached tag for `name`, else a Docker Hub lookup that is cached when non-empty.
async function resolveTag(d, name, source) {
  const file = path.join(d.env.XDG_CACHE_HOME || path.join(d.homedir(), '.cache'), 'cdk', 'scan-sonarqube-tags.json');
  const cache = readCache(d, file);
  const today = d.today();
  const hit = cache[name];
  if (hit && hit.date === today && typeof hit.tag === 'string' && hit.tag) return { tag: hit.tag, source: 'cached' };
  const tag = latestTag(await d.fetchText(source.url), source);
  if (!tag) throw new Error('image tag unresolved');
  cache[name] = { date: today, tag };
  d.writeText(file, JSON.stringify(cache));
  return { tag, source: 'looked-up' };
}

const SCANNER_IMAGES = { cli: 'sonarsource/sonar-scanner-cli', maven: 'maven', gradle: 'gradle' };

// Latest server and scanner tags for the stack, from today's cache or Docker Hub.
export async function tags({ stack, jdk } = {}, deps = {}) {
  if (!Object.hasOwn(SCANNER_IMAGES, stack ?? '')) throw new Error('--stack must be cli, maven, or gradle');
  const n = jdk === undefined ? DEFAULT_JDK : Number(jdk);
  if (!Number.isInteger(n) || n <= 0) throw new Error('--jdk must be a positive whole number');
  const d = { ...realDeps, ...deps };
  const server = await resolveTag(d, 'server', tagSource('server'));
  const scanner = await resolveTag(d, stack === 'cli' ? 'scanner-cli' : `${stack}-${n}`, tagSource(stack, n));
  return {
    server: server.tag,
    scanner: scanner.tag,
    scannerImage: SCANNER_IMAGES[stack],
    source: { server: server.source, scanner: scanner.source }
  };
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
}

// Side effects the CLI needs; tests pass stubs, everything else uses the real ones.
const realDeps = {
  git: (args, cwd) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    }),
  readText: (file) => {
    try {
      return readFileSync(file, 'utf8');
    } catch (err) {
      if (err?.code === 'ENOENT') return null;
      throw err;
    }
  },
  writeText: (file, text) => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text);
  },
  existsSync,
  homedir,
  env: process.env,
  today: () => new Date().toLocaleDateString('sv-SE'),
  fetchText: async (url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Docker Hub request failed: HTTP ${res.status}`);
    return res.text();
  },
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export async function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const usage = 'usage: sonar-setup.mjs detect --root <dir> | tags --stack <cli|maven|gradle> [--jdk <n>]';
  const sub = argv[0];
  if (sub === 'detect') {
    d.log(JSON.stringify(detect({ root: arg(argv, '--root') }, d)));
    return 0;
  }
  if (sub === 'tags') {
    d.log(JSON.stringify(await tags({ stack: arg(argv, '--stack'), jdk: arg(argv, '--jdk') }, d)));
    return 0;
  }
  d.error(usage);
  return 2;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'sonar-setup');
