// Checks for build-github-action: a YAML parse and metadata findings over one action.yml.
// CLI: an action directory or action.yml path; JSON `{ ok, yaml, findings }` on stdout; exit 0 ok, 1 findings, 2 usage.
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
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

const finding = (check, line, message, fix) => ({ check, line, message, fix });
const TIMEOUT = 30000;

// First available YAML-to-JSON converter; each runs with the text on stdin.
const PARSERS = [
  { cmd: 'yq', args: ['-o=json', '.'] },
  { cmd: 'python3', args: ['-I', '-c', 'import sys,json,yaml;print(json.dumps(yaml.safe_load(sys.stdin)))'] },
  { cmd: 'ruby', args: ['-ryaml', '-rjson', '-e', 'puts JSON.generate(YAML.safe_load(STDIN.read, aliases: true))'] }
];

// `{ status: 'pass', data }`, `{ status: 'fail', error }`, or `{ status: 'unverified' }` when no converter can run.
export function parseYaml(text, deps) {
  for (const { cmd, args } of PARSERS) {
    const res = deps.run(cmd, args, { input: text, timeout: TIMEOUT });
    if (res.error || /No module named|cannot load such file/.test(res.stderr ?? '')) continue;
    if (res.status !== 0) return { status: 'fail', error: String(res.stderr ?? '').split('\n')[0] };
    try {
      return { status: 'pass', data: JSON.parse(res.stdout) };
    } catch (err) {
      if (!(err instanceof SyntaxError)) throw err;
      return { status: 'fail', error: 'converter output is not JSON' };
    }
  }
  return { status: 'unverified' };
}

const isKebab = (s) => /^[a-z][a-z0-9-]*$/.test(s) && !s.includes('--') && !s.endsWith('-');
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Metadata findings: required keys, `runs` shape, and input and output contracts.
export function checkMetadata(data) {
  const findings = [];
  if (!isObject(data)) return [finding('metadata', 1, 'action.yml is not a mapping', 'write a YAML mapping')];
  for (const key of ['name', 'description', 'author']) {
    if (!data[key]) findings.push(finding('metadata', 1, `missing \`${key}\``, `add \`${key}\``));
  }
  const runs = isObject(data.runs) ? data.runs : {};
  const using = String(runs.using ?? '');
  if (!using) findings.push(finding('runs', 1, 'missing `runs.using`', 'set composite, node<version>, or docker'));
  if (/^node/.test(using) && !runs.main) findings.push(finding('runs', 1, '`node` action has no `main`', 'add `main`'));
  if (using === 'docker' && !runs.image)
    findings.push(finding('runs', 1, '`docker` action has no `image`', 'add `image`'));
  for (const [id, input] of Object.entries(data.inputs ?? {})) {
    if (!isKebab(id)) findings.push(finding('inputs', 1, `input \`${id}\` is not kebab-case`, 'rename it'));
    if (!input?.description) findings.push(finding('inputs', 1, `input \`${id}\` has no description`, 'add one'));
    if (input?.required === undefined)
      findings.push(finding('inputs', 1, `input \`${id}\` sets no \`required\``, 'set it'));
    if (input?.required === false && input.default === undefined) {
      findings.push(finding('inputs', 1, `optional input \`${id}\` has no \`default\``, 'add a default'));
    }
  }
  for (const [id, output] of Object.entries(data.outputs ?? {})) {
    if (!isKebab(id)) findings.push(finding('outputs', 1, `output \`${id}\` is not kebab-case`, 'rename it'));
    if (!output?.description) findings.push(finding('outputs', 1, `output \`${id}\` has no description`, 'add one'));
  }
  return findings;
}

// Composite steps: every `run:` step has `shell:`, and none interpolates `${{ inputs.* }}` into the script.
export function checkSteps(data) {
  const findings = [];
  const steps = isObject(data) && isObject(data.runs) && Array.isArray(data.runs.steps) ? data.runs.steps : [];
  steps.forEach((step, i) => {
    if (typeof step?.run !== 'string') return;
    const label = step.name ?? step.id ?? `#${i + 1}`;
    if (!step.shell)
      findings.push(finding('steps', 1, `step \`${label}\` has \`run\` but no \`shell\``, 'add `shell`'));
    if (/\$\{\{\s*inputs\./.test(step.run)) {
      findings.push(
        finding('injection', 1, `step \`${label}\` interpolates an input in \`run\``, 'pass it through `env:`')
      );
    }
  });
  return findings;
}

const realDeps = {
  readFile: (p) => readFileSync(p, 'utf8'),
  cwd: () => process.cwd(),
  run: (cmd, args, opts) => spawnSync(cmd, args, { encoding: 'utf8', ...opts }),
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (argv.length !== 1) {
    d.error('usage: check-action.mjs <action directory | action.yml>');
    return 2;
  }
  const root = d.cwd();
  const given = resolve(root, argv[0]);
  if (given !== root && !given.startsWith(root + sep))
    throw new Error(`path outside the working directory: ${argv[0]}`);
  const isFile = /\.ya?ml$/.test(given);
  const file = isFile ? given : join(given, 'action.yml');
  const findings = [];
  if (isFile && basename(file) !== 'action.yml') {
    findings.push(finding('file', 1, `file is \`${basename(file)}\``, 'name it action.yml'));
  }
  const parsed = parseYaml(d.readFile(file), d);
  if (parsed.status === 'fail') findings.push(finding('yaml', 1, parsed.error, 'fix the syntax'));
  if (parsed.status === 'pass') findings.push(...checkMetadata(parsed.data), ...checkSteps(parsed.data));
  const ok = findings.length === 0 && parsed.status === 'pass';
  d.log(JSON.stringify({ ok, yaml: parsed.status, findings }));
  return ok ? 0 : 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'check-action');
