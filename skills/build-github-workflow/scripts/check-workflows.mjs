// Checks for build-github-workflow: actionlint, a YAML parse, and policy findings over workflow files.
// CLI: workflow paths as args; JSON `{ ok, verified, actionlint, yaml, findings }` on stdout; exit 0 ok, 1 findings, 2 usage.
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
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

const finding = (check, path, line, message, fix) => ({ check, path, line, message, fix });
const TIMEOUT = 30000;

// First available YAML-to-JSON converter; each runs with the text on stdin.
const PARSERS = [
  { cmd: 'yq', args: ['-o=json', '.'] },
  { cmd: 'python3', args: ['-I', '-c', 'import sys,json,yaml;print(json.dumps(yaml.safe_load(sys.stdin)))'] },
  { cmd: 'ruby', args: ['-ryaml', '-rjson', '-e', 'puts JSON.generate(YAML.safe_load(STDIN.read, aliases: true))'] }
];

// Stderr of a converter that cannot run or serialize (missing module, unsupported flag, non-JSON type), not a YAML syntax error.
const TOOL_ERROR =
  /No module named|cannot load such file|unrecognized arguments|unknown (shorthand )?flag|^usage:|TypeError|not JSON serializable/im;

// `{ status: 'pass', data }`, `{ status: 'fail', error }`, or `{ status: 'unverified' }` when no converter can run.
export function parseYaml(text, deps) {
  for (const { cmd, args } of PARSERS) {
    const res = deps.run(cmd, args, { input: text, timeout: TIMEOUT });
    if (res.error || TOOL_ERROR.test(res.stderr ?? '')) continue;
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

// Lines inside `run:` blocks, as `{ line, text }`; a block scalar ends at the first line indented at or below its key.
function runLines(text) {
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)(- )?run:\s*(.*)$/);
    if (!m) continue;
    if (!/^[|>][+-]?\d?$/.test(m[3].trim())) {
      out.push({ line: i + 1, text: m[3] });
      continue;
    }
    const keyIndent = m[1].length + (m[2] ? m[2].length : 0);
    for (let j = i + 1; j < lines.length; j++) {
      const indent = lines[j].match(/^\s*/)[0].length;
      if (lines[j].trim() && indent <= keyIndent) break;
      out.push({ line: j + 1, text: lines[j] });
    }
  }
  return out;
}

const unquote = (s) => s.replace(/^['"]|['"]$/g, '');
const SHA = /^[0-9a-f]{40}$/;
const EXACT_TAG = /^v\d+\.\d+\.\d+$/;

// `pins`: remote `uses:` is a full SHA with a `# vX.Y.Z` comment; local and `docker://` references are skipped.
export function checkPins(path, text) {
  const findings = [];
  text.split('\n').forEach((raw, i) => {
    const m = raw.match(/^\s*(?:- )?uses:\s*(\S+)(.*)$/);
    if (!m) return;
    const ref = unquote(m[1]);
    if (ref.startsWith('./') || ref.startsWith('docker://')) return;
    const pin = ref.includes('@') ? ref.slice(ref.indexOf('@') + 1) : '';
    if (!SHA.test(pin)) {
      findings.push(
        finding('pins', path, i + 1, `\`${ref}\` is not pinned to a commit SHA`, 'use `@<40-hex> # vX.Y.Z`')
      );
    } else if (!EXACT_TAG.test(m[2].match(/#\s*(\S+)/)?.[1] ?? '')) {
      findings.push(
        finding('pins', path, i + 1, `\`${ref}\` has no exact \`# vX.Y.Z\` comment`, 'add the tag comment')
      );
    }
  });
  return findings;
}

// `runners`: no `*-latest` runner label.
export function checkRunners(path, text) {
  const findings = [];
  text.split('\n').forEach((raw, i) => {
    if (raw.trim().startsWith('#')) return;
    const label = raw.match(/\b(?:ubuntu|windows|macos)-latest\b/)?.[0];
    if (label) findings.push(finding('runners', path, i + 1, `\`${label}\` floats`, 'use a resolved runner label'));
  });
  return findings;
}

// `injection`: event data or a head ref interpolated inside a `run:` script.
export function checkInjection(path, text) {
  const findings = [];
  for (const { line, text: code } of runLines(text)) {
    if (/\$\{\{[^}]*\b(?:github\.event\.|github\.head_ref)/.test(code)) {
      findings.push(finding('injection', path, line, 'untrusted value inside `run:`', 'pass it through step `env:`'));
    }
  }
  return findings;
}

// `permissions` and `timeouts`: a top-level `permissions` block; `timeout-minutes` on every job that runs steps.
export function checkStructure(path, text, data) {
  const findings = [];
  if (!data || typeof data !== 'object') return findings;
  if (data.permissions === undefined) {
    findings.push(finding('permissions', path, 1, 'no top-level `permissions`', 'add least-privilege permissions'));
  }
  for (const [id, job] of Object.entries(data.jobs ?? {})) {
    if (!job || typeof job !== 'object' || job.uses !== undefined || job['timeout-minutes'] !== undefined) continue;
    const at = text.split('\n').findIndex((l) => l.startsWith(`  ${id}:`));
    findings.push(finding('timeouts', path, at + 1 || 1, `job \`${id}\` has no \`timeout-minutes\``, 'add a timeout'));
  }
  return findings;
}

// Runs actionlint once over every path; `{ status: 'not installed' | 'pass' | 'fail', findings }`.
export function runActionlint(paths, deps) {
  const res = deps.run('actionlint', ['-format', '{{json .}}', ...paths], { timeout: TIMEOUT });
  if (res.error?.code === 'ENOENT') return { status: 'not installed', findings: [] };
  if (res.error) throw res.error;
  if (!res.stdout && res.status !== 0 && res.status !== 1) {
    const reason = String(res.stderr ?? '').split('\n')[0] || `exit ${res.status}`;
    return { status: 'fail', findings: [finding('actionlint', '', 0, reason, '')] };
  }
  let items;
  try {
    items = JSON.parse(res.stdout || 'null') ?? [];
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err;
    return { status: 'fail', findings: [finding('actionlint', '', 0, String(res.stderr).split('\n')[0], '')] };
  }
  const findings = items.map((i) => finding('actionlint', i.filepath, i.line, i.message, ''));
  return { status: findings.length ? 'fail' : 'pass', findings };
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
  if (argv.length === 0) {
    d.error('usage: check-workflows.mjs <workflow file…>');
    return 2;
  }
  const root = d.cwd();
  const findings = [];
  const parses = [];
  for (const path of argv) {
    const abs = resolve(root, path);
    if (!abs.startsWith(root + sep)) throw new Error(`path outside the working directory: ${path}`);
    const text = d.readFile(abs);
    const parsed = parseYaml(text, d);
    parses.push(parsed.status);
    if (parsed.status === 'fail') findings.push(finding('yaml', path, 1, parsed.error, 'fix the syntax'));
    findings.push(
      ...checkPins(path, text),
      ...checkRunners(path, text),
      ...checkInjection(path, text),
      ...checkStructure(path, text, parsed.data)
    );
  }
  const lint = runActionlint(argv, d);
  findings.push(...lint.findings);
  const yaml = parses.includes('fail') ? 'fail' : parses.includes('unverified') ? 'unverified' : 'pass';
  const verified = lint.status !== 'not installed' && yaml !== 'unverified';
  const ok = findings.length === 0;
  d.log(JSON.stringify({ ok, verified, actionlint: lint.status, yaml, findings }));
  return ok ? 0 : 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'check-workflows');
