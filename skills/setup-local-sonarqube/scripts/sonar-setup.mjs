// Setup helper for cdk:setup-local-sonarqube: stack detection, image tag lookup with a daily cache, compose.sonar.yaml rendering, and server configuration into .env.sonar.
// CLI: `detect`, `tags`, `compose`, and `configure` (see `main` usage); JSON on stdout.
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
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
const HUB_API = 'https://hub.docker.com/v2';
const MAX_TAG_PAGES = 10;
const GIT_TIMEOUT_MS = 30_000;

const CLI_MARKERS = new Set([
  'package.json',
  'composer.json',
  'go.mod',
  'pyproject.toml',
  'requirements.txt',
  'Gemfile'
]);

// Generated or third-party directories per stack (`cli` covers every language list.
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

// Wrapper script and properties that must both be tracked for the build to use the wrapper.
const WRAPPER_FILES = {
  maven: ['mvnw', '.mvn/wrapper/maven-wrapper.properties'],
  gradle: ['gradlew', 'gradle/wrapper/gradle-wrapper.properties']
};

const SCANNERS = {
  maven: { scanner: 'maven' },
  gradle: { scanner: 'gradle' },
  cli: { scanner: 'scanner-cli' }
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

// Root markers win, then the shallowest; a build tool wins over the other markers; `only` keeps one build tool.
function pickStack(files, only) {
  const found = files.map((file) => ({ file, kind: classify(file), depth: depthOf(file) })).filter((m) => m.kind);
  const shallowest = (list) => list.filter((m) => m.depth === Math.min(...list.map((x) => x.depth)));
  const build = found.filter((m) => (only ? m.kind === only : m.kind === 'maven' || m.kind === 'gradle'));
  if (only && !build.length) return { stop: `no ${only} build found` };
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

const MAX_KEY_LENGTH = 400;
const SAFE_EXCLUSION = /^[A-Za-z0-9_./*?{}-]+$/;

// Why `key` cannot be used in a Sonar project key or a shell command; null when it is valid.
function keyProblem(key, fromProps) {
  if (!/^[A-Za-z0-9_.:-]+$/.test(key)) return 'unsafe or empty characters';
  if (key.length > MAX_KEY_LENGTH) return `longer than ${MAX_KEY_LENGTH} characters`;
  if (!/\D/.test(key)) return fromProps ? 'all digits' : 'directory name is all digits, set sonar.projectKey';
  return null;
}

// Detects key, stack, scanner, JDK, wrapper, and exclusions from the tracked files of `root`; makes no network call.
export function detect({ root, stack: wanted } = {}, deps = {}) {
  if (!root) throw new Error('--root is required');
  if (wanted !== undefined && wanted !== 'maven' && wanted !== 'gradle')
    throw new Error('--stack must be maven or gradle');
  const d = { ...realDeps, ...deps };
  const dir = path.resolve(root);
  const files = d.git(['ls-files', '-z'], dir).split('\0').filter(Boolean);
  const props = parseProperties(d.readText(path.join(dir, 'sonar-project.properties')));
  const propKey = props.get('sonar.projectKey');
  const rawKey =
    propKey ||
    path
      .basename(dir)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');
  const problem = keyProblem(rawKey, Boolean(propKey));
  const key = problem ? null : rawKey;
  const name = key ? `cdk-sonar-${key.replace(/[^A-Za-z0-9_.-]/g, '-')}` : null;
  const pick = pickStack(files, wanted);
  const read = (file) => d.readText(path.join(dir, file));
  let stop = problem ? `invalid sonar.projectKey: ${problem}` : pick.stop;
  if (!stop && pick.stack === 'gradle') {
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
  const excluded = stack ? STACK_DIRS[stack] : [];
  const tracked = new Set(files);
  const wrapper = WRAPPER_FILES[stack]
    ? WRAPPER_FILES[stack].every((f) => tracked.has(where === '.' ? f : `${where}/${f}`))
    : false;
  const patterns = [
    ...new Set([
      ...splitList(props.get('sonar.exclusions')),
      '**/.scannerwork/**',
      '**/.git/**',
      ...excluded.map((n) => `**/${n}/**`),
      ...generatedPaths(read('.gitattributes'))
    ])
  ];
  const exclusions = patterns.filter((p) => SAFE_EXCLUSION.test(p)).join(',');
  const dropped = patterns.filter((p) => !SAFE_EXCLUSION.test(p));
  const result = {
    key,
    name,
    stack,
    workdir: stack ? where : null,
    scanner: null,
    jdk,
    wrapper,
    exclusions,
    excluded,
    dropped
  };
  if (stack) Object.assign(result, SCANNERS[stack]);
  if (stop) result.stop = stop;
  if (pick.ask) result.ask = pick.ask;
  return result;
}

// Where each image tag comes from: the Docker Hub listing, the tag part before `suffix`, and the shape that part must have.
function tagSource(stack, jdk) {
  const hub = (repo) =>
    `${HUB_API}/namespaces/${repo.split('/')[0]}/repositories/${repo.split('/')[1]}/tags?page_size=100`;
  if (stack === 'maven')
    return {
      url: hub('library/maven'),
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded patterns applied to short repo or registry strings
      core: /^\d+(\.\d+){2}$/,
      suffix: `-eclipse-temurin-${jdk}`
    };
  if (stack === 'gradle')
    return {
      url: hub('library/gradle'),
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded patterns applied to short repo or registry strings
      core: /^\d+(\.\d+){1,2}$/,
      suffix: `-jdk${jdk}`
    };
  if (stack === 'server')
    return {
      url: hub('library/sonarqube'),
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded patterns applied to short repo or registry strings
      core: /^\d+(\.\d+){3}$/,
      suffix: '-community'
    };
  return {
    url: hub('sonarsource/sonar-scanner-cli'),
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

// Highest tag of `names` that matches the source shape; empty string when none.
function latestTag(names, { core, suffix }) {
  let best = '';
  let bestNums = [];
  for (const name of names) {
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

// Tag names and the next page URL (only on Docker Hub's API host) of one listing page.
function parseListing(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    if (err instanceof SyntaxError) return { names: [], next: null };
    throw err;
  }
  const names = Array.isArray(json?.results)
    ? json.results.map((r) => r?.name).filter((n) => typeof n === 'string')
    : [];
  const next = typeof json?.next === 'string' && json.next.startsWith(`${HUB_API}/`) ? json.next : null;
  return { names, next };
}

// Today's cached tag for `name`, else a Docker Hub lookup that is cached when non-empty.
async function resolveTag(d, name, source) {
  const file = path.join(
    d.env.XDG_CACHE_HOME || path.join(d.homedir(), '.cache'),
    'cdk',
    'setup-local-sonarqube-tags.json'
  );
  const cache = readCache(d, file);
  const today = d.today();
  const hit = cache[name];
  if (hit && hit.date === today && typeof hit.tag === 'string' && hit.tag) return { tag: hit.tag, source: 'cached' };
  const names = [];
  let url = source.url;
  for (let page = 0; url && page < MAX_TAG_PAGES; page++) {
    const body = parseListing(await d.fetchText(url));
    names.push(...body.names);
    url = body.next;
  }
  const tag = latestTag(names, source);
  if (!tag) throw new Error('image tag unresolved');
  cache[name] = { date: today, tag };
  d.writeText(file, JSON.stringify(cache));
  return { tag, source: 'looked-up' };
}

const SCANNER_IMAGES = { cli: 'sonarsource/sonar-scanner-cli', maven: 'maven', gradle: 'gradle' };

// Latest server and scanner tags for the stack, from today's cache or Docker Hub; no stack gives the server only.
export async function tags({ stack, jdk } = {}, deps = {}) {
  if (stack !== undefined && !Object.hasOwn(SCANNER_IMAGES, stack))
    throw new Error('--stack must be cli, maven, or gradle');
  const n = jdk === undefined ? DEFAULT_JDK : Number(jdk);
  if (!Number.isInteger(n) || n <= 0) throw new Error('--jdk must be a positive whole number');
  const d = { ...realDeps, ...deps };
  const server = await resolveTag(d, 'server', tagSource('server'));
  if (stack === undefined)
    return { server: server.tag, scanner: null, scannerImage: null, source: { server: server.source, scanner: null } };
  const scanner = await resolveTag(d, stack === 'cli' ? 'scanner-cli' : `${stack}-${n}`, tagSource(stack, n));
  return {
    server: server.tag,
    scanner: scanner.tag,
    scannerImage: SCANNER_IMAGES[stack],
    source: { server: server.source, scanner: scanner.source }
  };
}

const COMPOSE_FILE = 'compose.sonar.yaml';
const TASKS_FILE = path.join('.vscode', 'tasks.json');
const SAFE_TAG = /^[A-Za-z0-9._-]+$/;
const SAFE_IMAGE = /^[a-z0-9._/-]+$/;
const SAFE_KEY = /^[A-Za-z0-9_.:-]+$/;

const SCAN_BODY = {
  cli: 'sonar-scanner -Dsonar.working.directory=/tmp/.scannerwork',
  maven: 'mvn -B clean verify org.sonarsource.scanner.maven:sonar-maven-plugin:sonar',
  gradle: 'gradle sonar'
};
const WRAPPER_BODY = {
  maven: 'sh ./mvnw -B clean verify org.sonarsource.scanner.maven:sonar-maven-plugin:sonar',
  gradle: 'sh ./gradlew sonar'
};
const HEALTH_CHECK = `curl -fsS http://localhost:9000/api/system/status | grep -q '"status":"UP"'`;
const SCAN_CACHE = { maven: ['maven-cache', '/root/.m2'], gradle: ['gradle-cache', '/root/.gradle'] };

function checkTag(label, tag) {
  if (typeof tag !== 'string' || !SAFE_TAG.test(tag) || tag === 'latest')
    throw new Error(`${label} tag is unsafe or missing`);
}

const volumeLines = (source, target, readOnly = false) => [
  '      - type: volume',
  `        source: ${source}`,
  `        target: ${target}`,
  ...(readOnly ? ['        read_only: true'] : [])
];

// compose.sonar.yaml text: the pinned server, plus a `scan`-profile scanner when `stack` is set.
export function renderCompose({ name, key, stack, workdir, wrapper, server, scannerImage, scanner, exclusions } = {}) {
  checkTag('server', server);
  if (stack !== undefined && stack !== null && !Object.hasOwn(SCAN_BODY, stack))
    throw new Error('stack must be cli, maven, or gradle');
  const project = name
    ? String(name)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
    : null;
  const volumes = ['sonarqube-data', 'sonarqube-extensions', 'sonarqube-logs'];
  const lines = [
    ...(project ? [`name: ${project}`] : []),
    'services:',
    '  sonarqube:',
    `    image: sonarqube:${server}`,
    '    ports:',
    '      - target: 9000',
    '        published: "${SONAR_PORT:-9000}"',
    '        host_ip: 127.0.0.1',
    '    environment:',
    '      SONAR_ES_BOOTSTRAP_CHECKS_DISABLE: "true"',
    '    healthcheck:',
    `      test: ${JSON.stringify(['CMD-SHELL', HEALTH_CHECK])}`,
    '      interval: 10s',
    '      timeout: 5s',
    '      retries: 30',
    '      start_period: 60s',
    '    volumes:',
    ...volumeLines('sonarqube-data', '/opt/sonarqube/data'),
    ...volumeLines('sonarqube-extensions', '/opt/sonarqube/extensions'),
    ...volumeLines('sonarqube-logs', '/opt/sonarqube/logs')
  ];
  if (stack) {
    checkTag('scanner', scanner);
    if (typeof scannerImage !== 'string' || !SAFE_IMAGE.test(scannerImage))
      throw new Error('scanner image is unsafe or missing');
    if (typeof key !== 'string' || !SAFE_KEY.test(key) || key.length > MAX_KEY_LENGTH)
      throw new Error('key is unsafe or missing');
    const excl = String(exclusions ?? '');
    if (excl && !excl.split(',').every((p) => SAFE_EXCLUSION.test(p)))
      throw new Error('exclusions have unsafe characters');
    const sub = workdir && workdir !== '.' ? workdir : null;
    if (sub !== null && (!/^[A-Za-z0-9_./-]+$/.test(sub) || sub.split('/').includes('..')))
      throw new Error('workdir is unsafe');
    if (wrapper !== undefined && typeof wrapper !== 'boolean') throw new Error('wrapper must be a boolean');
    const body = wrapper && WRAPPER_BODY[stack] ? WRAPPER_BODY[stack] : SCAN_BODY[stack];
    const where = `${stack === 'cli' ? '/src' : '/tmp/work'}${sub ? `/${sub}` : ''}`;
    const copy = stack === 'cli' ? '' : 'cp -a /src/. /tmp/work && ';
    const command = `${copy}cd ${where} && ${body} -Dsonar.projectKey=${key} -Dsonar.host.url="$$SONAR_HOST_URL" -Dsonar.qualitygate.wait=true -Dsonar.exclusions="$$SONAR_EXCLUSIONS"`;
    const cache = SCAN_CACHE[stack];
    lines.push(
      '  scanner:',
      '    profiles:',
      '      - scan',
      `    image: ${scannerImage}:${scanner}`,
      '    depends_on:',
      '      sonarqube:',
      '        condition: service_healthy',
      '    env_file:',
      '      - path: .env.sonar',
      '        required: false',
      '    environment:',
      '      - SONAR_HOST_URL=http://sonarqube:9000',
      `      - ${JSON.stringify(`SONAR_EXCLUSIONS=${excl}`)}`,
      '    volumes:',
      '      - type: bind',
      '        source: .',
      '        target: /src',
      '        read_only: true',
      ...(cache ? volumeLines(cache[0], cache[1]) : []),
      '    entrypoint:',
      '      - sh',
      '      - -c',
      '    command:',
      `      - ${JSON.stringify(command)}`
    );
    if (cache) volumes.push(cache[0]);
  }
  lines.push('volumes:', ...volumes.map((v) => `  ${v}: {}`));
  return `${lines.join('\n')}\n`;
}

const TASK_LABELS = { start: 'sonar: start', stop: 'sonar: stop', scan: 'sonar: scan' };
const composeArgs = (...rest) => ['compose', '-f', COMPOSE_FILE, ...rest];

// `.vscode/tasks.json` content with the sonar tasks added or replaced by label; every other task and input stays.
export function renderTasks(existing, { scanner } = {}) {
  if (existing !== null && existing !== undefined && (typeof existing !== 'object' || Array.isArray(existing)))
    throw new Error('tasks.json must be a JSON object');
  const out = { ...existing };
  if (out.version === undefined) out.version = '2.0.0';
  if (out.tasks !== undefined && !Array.isArray(out.tasks)) throw new Error('tasks must be an array');
  if (out.inputs !== undefined && !Array.isArray(out.inputs)) throw new Error('inputs must be an array');
  const proc = (label, args, options) => ({
    label,
    type: 'process',
    command: 'docker',
    args,
    ...(options ? { options } : {}),
    problemMatcher: []
  });
  const mine = [
    proc(TASK_LABELS.start, composeArgs('up', '-d', '--wait', 'sonarqube')),
    proc(TASK_LABELS.stop, composeArgs('down')),
    ...(scanner ? [proc(TASK_LABELS.scan, composeArgs('run', '--rm', 'scanner'))] : [])
  ];
  const labels = new Set(Object.values(TASK_LABELS));
  const replaced = new Set();
  const tasks = (out.tasks ?? []).flatMap((t) => {
    const next = mine.find((m) => m.label === t?.label);
    if (next) {
      if (replaced.has(next.label)) return [];
      replaced.add(next.label);
      return [next];
    }
    return labels.has(t?.label) ? [] : [t];
  });
  out.tasks = [...tasks, ...mine.filter((m) => !replaced.has(m.label))];
  const inputs = (out.inputs ?? []).filter((i) => i?.id !== 'sonarToken');
  if (inputs.length) out.inputs = inputs;
  else delete out.inputs;
  return out;
}

// True when `file` (or its nearest existing ancestor) resolves to a place inside the real `dir`.
function contained(d, dir, file) {
  const base = d.realpath(dir);
  if (!base) return false;
  let at = file;
  for (let real = d.realpath(at); !real; real = d.realpath(at)) {
    const parent = path.dirname(at);
    if (parent === at) return false;
    at = parent;
  }
  const rel = path.relative(base, d.realpath(at));
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}

// Writes compose.sonar.yaml and .vscode/tasks.json under `root`; refuses an existing compose file without `force`.
export async function compose({ root, stack, force } = {}, deps = {}) {
  if (!root) throw new Error('--root is required');
  const d = { ...realDeps, ...deps };
  const dir = path.resolve(root);
  const det = detect({ root: dir, stack }, d);
  const result = {
    path: null,
    stack: det.stack,
    services: [],
    server: null,
    scanner: null,
    tasks: null,
    taskLabels: [],
    dropped: det.dropped
  };
  if (det.ask) return { ...result, ask: det.ask };
  const file = path.join(dir, COMPOSE_FILE);
  if (d.existsSync(file) && !force) return { ...result, stop: `${COMPOSE_FILE} exists` };
  const tasksFile = path.join(dir, TASKS_FILE);
  if (!contained(d, dir, file) || !contained(d, dir, tasksFile) || d.isSymlink(file) || d.isSymlink(tasksFile))
    throw new Error('target path is a symlink or resolves outside the repo root');
  const t = await tags({ stack: det.stack ?? undefined, jdk: det.jdk ?? undefined }, d);
  const withScanner = Boolean(det.stack);
  const yaml = renderCompose({
    name: det.name,
    key: det.key,
    stack: det.stack,
    workdir: det.workdir,
    wrapper: det.wrapper,
    server: t.server,
    scannerImage: t.scannerImage,
    scanner: t.scanner,
    exclusions: det.exclusions
  });
  // Parse and render the tasks before the first write, so a failure leaves nothing half-written.
  const text = d.readText(tasksFile);
  let existing = null;
  let plain = true;
  if (text !== null) {
    try {
      existing = JSON.parse(text);
    } catch (err) {
      if (!(err instanceof SyntaxError)) throw err;
      plain = false;
    }
  }
  const merged = plain ? renderTasks(existing, { scanner: withScanner }) : null;
  d.writeText(file, yaml);
  Object.assign(result, {
    path: file,
    services: withScanner ? ['sonarqube', 'scanner'] : ['sonarqube'],
    server: `sonarqube:${t.server}`,
    scanner: withScanner ? `${t.scannerImage}:${t.scanner}` : null
  });
  if (det.stop) result.stop = det.stop;
  if (!merged) return { ...result, tasksStop: '.vscode/tasks.json is not plain JSON' };
  d.writeText(tasksFile, `${JSON.stringify(merged, null, 2)}\n`);
  return {
    ...result,
    tasks: tasksFile,
    taskLabels: merged.tasks.map((x) => x.label).filter((l) => l.startsWith('sonar: '))
  };
}

const ENV_FILE = '.env.sonar';
const GITIGNORE_FILE = '.gitignore';
const TOKEN_NAME = 'cdk-setup-local-sonarqube';
const DOCKER_TIMEOUT_MS = 30_000;
const STATUS_ATTEMPTS = 30;
const STATUS_WAIT_MS = 5000;
const REQUEST_TIMEOUT_MS = 10_000;
const PASSWORD_LENGTH = 24;
const PASSWORD_CLASSES = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '-_.+@'];

// Plain `KEY=VALUE` lines of an env file; comments and blank lines are skipped.
function parseEnv(text) {
  const env = new Map();
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line[0] === '#') continue;
    const i = line.indexOf('=');
    if (i > 0) env.set(line.slice(0, i).trim(), line.slice(i + 1).trim());
  }
  return env;
}

// A 24-character password with at least one upper, lower, digit, and special character from `d.randomBytes`.
function generatePassword(d) {
  const all = PASSWORD_CLASSES.join('');
  const bytes = d.randomBytes(PASSWORD_LENGTH * 2);
  const chars = [
    ...PASSWORD_CLASSES.map((set, i) => set[bytes[i] % set.length]),
    ...Array.from({ length: PASSWORD_LENGTH - PASSWORD_CLASSES.length }, (_, i) => all[bytes[i + 4] % all.length])
  ];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[PASSWORD_LENGTH + i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const basic = (login, password) => `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;

// One SonarQube API call; form bodies are URL-encoded and the response is returned unread.
function call(d, base, auth, method, endpoint, form) {
  const headers = { Authorization: auth };
  const init = { method, headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) };
  if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    init.body = new URLSearchParams(form).toString();
  }
  return d.fetch(`${base}/${endpoint}`, init);
}

// The response JSON of a call that must answer 2xx; the error names the endpoint and status, never the body.
async function callJson(d, base, auth, method, endpoint, form) {
  const res = await call(d, base, auth, method, endpoint, form);
  if (!res.ok) throw new Error(`${endpoint.split('?')[0]} failed (${res.status})`);
  return res.status === 204 ? {} : res.json();
}

const isOffline = (err) => err instanceof TypeError || err?.name === 'TimeoutError';

// Polls api/system/status until `UP`; returns the last status seen (`unreachable` when no answer).
async function waitUp(d, base) {
  let status = 'unreachable';
  for (let i = 0; i < STATUS_ATTEMPTS; i++) {
    try {
      const res = await call(d, base, basic('', ''), 'GET', 'api/system/status');
      status = res.ok ? String((await res.json())?.status) : `HTTP ${res.status}`;
    } catch (err) {
      if (!isOffline(err)) throw err;
      status = 'unreachable';
    }
    if (status === 'UP') return status;
    if (i < STATUS_ATTEMPTS - 1) await d.sleep(STATUS_WAIT_MS);
  }
  return status;
}

async function validLogin(d, base, login, password) {
  const res = await call(d, base, basic(login, password), 'GET', 'api/authentication/validate');
  return res.ok && (await res.json())?.valid === true;
}

// Appends `.env.sonar` to .gitignore unless git already ignores it; returns `added` or `present`.
function ensureIgnored(d, dir) {
  try {
    d.git(['check-ignore', '-q', ENV_FILE], dir);
    return 'present';
  } catch (err) {
    if (err?.status !== 1) throw err;
  }
  const file = path.join(dir, GITIGNORE_FILE);
  if (!contained(d, dir, file) || d.isSymlink(file))
    throw new Error('.gitignore is a symlink or resolves outside the repo root');
  const text = d.readText(file) ?? '';
  d.writeText(file, `${text}${text && !text.endsWith('\n') ? '\n' : ''}${ENV_FILE}\n`);
  return 'added';
}

// The host port Docker published for the sonarqube container (`127.0.0.1:9001`, `[::]:9001`).
function publishedPort(d, dir) {
  const line = String(d.docker(composeArgs('port', 'sonarqube', '9000'), dir))
    .split(/\r?\n/)
    .find((l) => l.trim());
  const n = Number(/:(\d+)$/.exec(line?.trim() ?? '')?.[1]);
  if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error('sonarqube port not published');
  return n;
}

// Configures the running server (admin password, project, analysis token) and writes `.env.sonar`; returns no secret values.
export async function configure({ root } = {}, deps = {}) {
  if (!root) throw new Error('--root is required');
  const d = { ...realDeps, ...deps };
  const dir = path.resolve(root);
  const file = path.join(dir, ENV_FILE);
  if (!contained(d, dir, file) || d.isSymlink(file))
    throw new Error(`${ENV_FILE} is a symlink or resolves outside the repo root`);
  const env = parseEnv(d.readText(file));
  const n = publishedPort(d, dir);
  const det = detect({ root: dir }, d);
  const result = {
    env: null,
    url: `http://localhost:${n}`,
    password: null,
    project: null,
    token: null,
    tokenType: null,
    gitignore: null
  };
  const base = `http://127.0.0.1:${n}`;
  // Ignores the file first, then writes it, so a secret is never on disk unignored; called again as new values arrive.
  const persist = (values) => {
    result.gitignore ??= ensureIgnored(d, dir);
    for (const [k, v] of Object.entries(values)) env.set(k, v);
    const body = [...env].map(([k, v]) => `${k}=${v}`).join('\n');
    d.writeText(
      file,
      `# Written by cdk:setup-local-sonarqube. Docker Compose interpolation reads the shell or .env, not this file.\n${body}\n`,
      0o600
    );
    result.env = file;
  };
  const status = await waitUp(d, base);
  if (status !== 'UP') return { ...result, stop: `server not UP (${status})` };

  let password = env.get('SONAR_ADMIN_PASSWORD');
  if (password && (await validLogin(d, base, 'admin', password))) {
    result.password = 'reused';
  } else if (await validLogin(d, base, 'admin', 'admin')) {
    password = generatePassword(d);
    const res = await call(d, base, basic('admin', 'admin'), 'POST', 'api/users/change_password', {
      login: 'admin',
      previousPassword: 'admin',
      password
    });
    if (!res.ok) throw new Error(`api/users/change_password failed (${res.status})`);
    persist({ SONAR_ADMIN_PASSWORD: password });
    result.password = 'set';
  } else {
    return { ...result, stop: 'admin password unknown' };
  }

  const auth = basic('admin', password);
  const projectKey = det.stack && det.key ? det.key : null;
  if (projectKey) {
    const found = await callJson(
      d,
      base,
      auth,
      'GET',
      `api/projects/search?projects=${encodeURIComponent(projectKey)}`
    );
    const exists = Array.isArray(found?.components) && found.components.some((c) => c?.key === projectKey);
    if (!exists) {
      await callJson(d, base, auth, 'POST', 'api/projects/create', {
        project: projectKey,
        name: det.name ?? projectKey
      });
    }
    result.project = exists ? 'exists' : 'created';
  }
  const listed = await callJson(d, base, auth, 'GET', 'api/user_tokens/search');
  const rotated = Array.isArray(listed?.userTokens) && listed.userTokens.some((t) => t?.name === TOKEN_NAME);
  const revoked = await call(d, base, auth, 'POST', 'api/user_tokens/revoke', { name: TOKEN_NAME });
  if (!revoked.ok) {
    const missing = revoked.status === 404 || (revoked.status === 400 && /not found/i.test(await revoked.text()));
    if (!missing) throw new Error(`api/user_tokens/revoke failed (${revoked.status})`);
  }
  result.tokenType = projectKey ? 'PROJECT_ANALYSIS_TOKEN' : 'GLOBAL_ANALYSIS_TOKEN';
  const minted = await callJson(d, base, auth, 'POST', 'api/user_tokens/generate', {
    name: TOKEN_NAME,
    type: result.tokenType,
    ...(projectKey ? { projectKey } : {})
  });
  if (typeof minted?.token !== 'string' || !minted.token) throw new Error('api/user_tokens/generate failed (no token)');
  result.token = rotated ? 'rotated' : 'created';

  persist({
    SONAR_HOST_URL: result.url,
    SONAR_TOKEN: minted.token,
    SONAR_ADMIN_PASSWORD: password
  });
  return result;
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
  docker: (args, cwd) =>
    execFileSync('docker', args, {
      cwd,
      encoding: 'utf8',
      timeout: DOCKER_TIMEOUT_MS,
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
  writeText: (file, text, mode) => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text, mode === undefined ? undefined : { mode });
    if (mode !== undefined) chmodSync(file, mode);
  },
  fetch: (url, init) => fetch(url, init),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  randomBytes: (n) => randomBytes(n),
  realpath: (p) => {
    try {
      return realpathSync(p);
    } catch (err) {
      if (err?.code === 'ENOENT' || err?.code === 'ENOTDIR') return null;
      throw err;
    }
  },
  isSymlink: (p) => {
    try {
      return lstatSync(p).isSymbolicLink();
    } catch (err) {
      if (err?.code === 'ENOENT' || err?.code === 'ENOTDIR') return false;
      throw err;
    }
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
  const usage =
    'usage: sonar-setup.mjs detect --root <dir> [--stack <maven|gradle>] | tags [--stack <cli|maven|gradle>] [--jdk <n>] | compose --root <dir> [--stack <maven|gradle>] [--force] | configure --root <dir>';
  const sub = argv[0];
  if (sub === 'detect') {
    d.log(JSON.stringify(detect({ root: arg(argv, '--root'), stack: arg(argv, '--stack') }, d)));
    return 0;
  }
  if (sub === 'tags') {
    d.log(JSON.stringify(await tags({ stack: arg(argv, '--stack'), jdk: arg(argv, '--jdk') }, d)));
    return 0;
  }
  if (sub === 'compose') {
    const args = { root: arg(argv, '--root'), stack: arg(argv, '--stack'), force: argv.includes('--force') };
    d.log(JSON.stringify(await compose(args, d)));
    return 0;
  }
  if (sub === 'configure') {
    d.log(JSON.stringify(await configure({ root: arg(argv, '--root') }, d)));
    return 0;
  }
  d.error(usage);
  return 2;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'sonar-setup');
