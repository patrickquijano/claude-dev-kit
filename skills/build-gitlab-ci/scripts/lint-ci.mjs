// Validates a GitLab pipeline: `lint-ci.mjs [repo root]`; prints a method= line plus raw messages, never the token.
// Exit 0 valid, 1 invalid, 2 no validator available.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
const AUTH_FAILURE =
  /\bHTTP[ /]?(?:401|403)\b|\b(?:401|403)\s+(?:unauthori[sz]ed|forbidden)|unauthori[sz]ed|authentication (?:failed|required)|not logged|no token|could not resolve|connection refused|no such host|not a git|no git remote/i;
const HOST = /^[A-Za-z0-9.-]+$/;
const SEGMENT = /^[A-Za-z0-9._-]+$/;
const YAMLLINT_CONFIG = '{extends: relaxed, rules: {line-length: disable}}';
const PYYAML_SNIPPET = `
import sys, yaml
yaml.SafeLoader.add_constructor("!reference", lambda loader, node: loader.construct_sequence(node))
yaml.safe_load(open(sys.argv[1]))
`;

// CI Lint resolves include:local from the remote ref, so inline the job files: drop the local include, then append them.
export function mergePipeline(rootText, jobTexts) {
  const lines = rootText.split('\n');
  if (lines.at(-1) === '') lines.pop();
  const out = [];
  let held = null;
  for (const line of lines) {
    if (/local:.*\.gitlab\/ci\//.test(line)) continue;
    if (/^include:\s*$/.test(line)) {
      if (held !== null) out.push(held);
      held = line;
      continue;
    }
    if (held !== null) {
      if (/^\s+-/.test(line)) out.push(held);
      held = null;
    }
    out.push(line);
  }
  for (const text of jobTexts) {
    out.push('');
    out.push(...text.split('\n').filter((line) => !/^---\s*$/.test(line)));
  }
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

// Splits an origin URL (https, ssh://, or scp syntax) into a validated `{host, path}`, or null.
export function parseRemote(url) {
  if (typeof url !== 'string') return null;
  const text = url.trim();
  let host;
  let path;
  if (/^[a-z+]+:\/\//.test(text)) {
    const rest = text.replace(/^[a-z+]+:\/\//, '');
    const slash = rest.indexOf('/');
    if (slash < 0) return null;
    host = rest.slice(0, slash).split('@').pop().split(':')[0];
    path = rest.slice(slash + 1);
  } else {
    const scp = /^[^@/:]+@([^:/]+):(.+)$/.exec(text);
    if (!scp) return null;
    [, host, path] = scp;
  }
  path = path.replace(/\/+$/, '').replace(/\.git$/, '');
  if (!HOST.test(host)) return null;
  const segments = path.split('/');
  if (!segments.every((s) => s !== '.' && s !== '..' && SEGMENT.test(s))) return null;
  return { host, path };
}

// Side effects the CLI needs; tests pass stubs.
const realDeps = {
  run: (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', timeout: TIMEOUT }),
  fetch: (url, init) => fetch(url, init),
  exists: existsSync,
  readFile: (path) => readFileSync(path, 'utf8'),
  readDir: (path) => readdirSync(path),
  writeFile: writeFileSync,
  makeTempDir: () => mkdtempSync(join(tmpdir(), 'lint-ci-')),
  rm: (path) => rmSync(path, { recursive: true, force: true }),
  env: process.env,
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// Runs a tool; null when it is not installed (ENOENT), any other spawn error is rethrown.
function tool(d, cmd, args) {
  const res = d.run(cmd, args);
  if (res?.error?.code === 'ENOENT') return null;
  if (res?.error) throw res.error;
  return res;
}

const output = (res) => `${res.stdout ?? ''}${res.stderr ?? ''}`;

// The token goes only to GITLAB_HOST, or to gitlab.com when the origin is gitlab.com; never to a host named by the origin alone.
async function lintViaApi(d, root, content) {
  const token = d.env.GITLAB_TOKEN;
  if (!token) return null;
  const remote = d.run('git', ['-C', root, 'remote', 'get-url', 'origin']);
  const parsed = remote?.status === 0 ? parseRemote(remote.stdout) : null;
  const host = d.env.GITLAB_HOST || (parsed?.host === 'gitlab.com' ? 'gitlab.com' : null);
  if (!host || !HOST.test(host) || !parsed) return null;
  let res;
  try {
    res = await d.fetch(`https://${host}/api/v4/projects/${encodeURIComponent(parsed.path)}/ci/lint`, {
      method: 'POST',
      headers: { 'PRIVATE-TOKEN': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(TIMEOUT)
    });
  } catch (err) {
    if (err instanceof TypeError || err?.name === 'TimeoutError') return null;
    throw err;
  }
  if (!res.ok) return null;
  const body = await res.text();
  let valid = false;
  try {
    valid = JSON.parse(body)?.valid === true;
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err;
  }
  return { body, valid };
}

// CLI body; returns the exit code.
export async function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const root = argv[0] ?? '.';
  const rootFile = join(root, '.gitlab-ci.yml');
  if (!d.exists(rootFile)) {
    d.error(`no .gitlab-ci.yml in ${root}`);
    return 1;
  }
  const jobDir = join(root, '.gitlab/ci');
  const jobFiles = d.exists(jobDir)
    ? d
        .readDir(jobDir)
        .filter((f) => f.endsWith('.gitlab-ci.yml'))
        .sort()
    : [];
  const content = mergePipeline(
    d.readFile(rootFile),
    jobFiles.map((f) => d.readFile(join(jobDir, f)))
  );
  const work = d.makeTempDir();
  try {
    const merged = join(work, 'merged.gitlab-ci.yml');
    d.writeFile(merged, content);

    const glab = tool(d, 'glab', ['ci', 'lint', merged]);
    if (glab) {
      const text = output(glab);
      if (glab.status === 0 || !AUTH_FAILURE.test(text)) {
        d.log(`method=glab\n${text.replace(/\n$/, '')}`);
        return glab.status === 0 ? 0 : 1;
      }
    }

    const api = await lintViaApi(d, root, content);
    if (api) {
      d.log(`method=api\n${api.body}`);
      return api.valid ? 0 : 1;
    }

    const yamllint = tool(d, 'yamllint', ['-d', YAMLLINT_CONFIG, merged]);
    if (yamllint) {
      d.log(`method=yamllint scope=syntax\n${output(yamllint).replace(/\n$/, '')}`.trimEnd());
      return yamllint.status === 0 ? 0 : 1;
    }

    const hasYaml = tool(d, 'python3', ['-I', '-c', 'import yaml']);
    if (hasYaml?.status === 0) {
      const py = tool(d, 'python3', ['-I', '-c', PYYAML_SNIPPET, merged]);
      d.log(`method=pyyaml scope=syntax\n${output(py).replace(/\n$/, '')}`.trimEnd());
      return py.status === 0 ? 0 : 1;
    }

    d.log('method=none');
    d.error('no validator available (glab, GITLAB_TOKEN, yamllint, python3 yaml)');
    return 2;
  } finally {
    d.rm(work);
  }
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'lint-ci');
