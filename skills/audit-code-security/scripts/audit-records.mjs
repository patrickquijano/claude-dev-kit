// Deterministic records for audit-code-security: `init` scope, `ledger` check, and `findings` check.
// CLI: `init --root <abs> [--profile <p>] [--range <a>..<b>] [path ...]`, `ledger --run <abs>`, `findings --run <abs>`.
import {
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

const GIT_TIMEOUT_MS = 60_000;
const MAX_BUFFER = 256 * 1024 * 1024;
const MAX_UNITS = 40;
const MAX_EVIDENCE_LINES = 3;
const RUN_BASE = '.cdk-security-audit';
const HIDING_CODES = ['ENOENT', 'ELOOP', 'ENOTDIR', 'EACCES'];

class UsageError extends Error {}

const byteSort = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const isStrings = (v) => Array.isArray(v) && v.every((s) => typeof s === 'string');
const under = (f, p) => f === p || f.startsWith(`${p}/`);

// A secret-shaped file name (`.env*`, key, cert, keystore, and `.tfvars` files, `id_<algo>` keys, `credentials*`, `secrets.*`, and dotfiles such as `.netrc`); mirrors `isSensitive` in review-code-changes. `credentials*` also hides files like credentials.service.ts; over-hiding is the safe failure, and the pattern mirrors `isSensitive` in review-code-changes/scripts/diff-manifest.mjs.
function isSensitive(path) {
  const name = basename(path);
  return (
    /^\.env/i.test(name) ||
    /\.(pem|key|p12|pfx|jks|keystore|tfvars)$/i.test(name) ||
    /^id_(rsa|dsa|ecdsa|ed25519)/i.test(name) ||
    /^credentials/i.test(name) ||
    /^secrets\./i.test(name) ||
    /^\.(netrc|npmrc|pgpass|pypirc|git-credentials)$/i.test(name)
  );
}

function typeOf(value) {
  if (value === null) return 'null';
  return Array.isArray(value) ? 'array' : typeof value;
}

function matchesType(value, type) {
  if (type === 'integer') return Number.isInteger(value);
  return type === 'number' ? typeof value === 'number' : typeOf(value) === type;
}

// Hand-rolled check for the schema keywords the report schema uses; returns `{path, message}` entries and never echoes a value.
function validateSchema(value, schema, path, out) {
  if (schema.type !== undefined) {
    const types = [].concat(schema.type);
    if (!types.some((t) => matchesType(value, t))) {
      out.push({ path, message: `${path}: expected ${types.join(' or ')}` });
      return out;
    }
  }
  if (schema.enum && !schema.enum.includes(value)) out.push({ path, message: `${path}: not an allowed value` });
  // eslint-disable-next-line security/detect-non-literal-regexp -- the pattern comes from the bundled schema file, never from audited input
  if (typeof value === 'string' && schema.pattern && !new RegExp(schema.pattern).test(value))
    out.push({ path, message: `${path}: does not match pattern ${schema.pattern}` });
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum)
    out.push({ path, message: `${path}: below minimum ${schema.minimum}` });
  if (typeOf(value) === 'object') {
    for (const key of schema.required ?? [])
      if (!Object.hasOwn(value, key)) out.push({ path, message: `${path}: missing ${key}` });
    for (const key of Object.keys(value)) {
      if (schema.properties && Object.hasOwn(schema.properties, key))
        validateSchema(value[key], schema.properties[key], `${path}.${key}`, out);
      else if (schema.additionalProperties === false)
        out.push({ path, message: `${path}: unexpected property ${key.slice(0, 80)}` });
    }
  }
  if (Array.isArray(value) && schema.items)
    value.forEach((v, i) => validateSchema(v, schema.items, `${path}[${i}]`, out));
  return out;
}

// Side effects the CLI needs; tests pass stubs, everything else uses the real ones.
const realDeps = {
  spawnSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmdirSync,
  rmSync,
  writeFileSync,
  schemaPath: fileURLToPath(new URL('../assets/report-schema.json', import.meta.url)),
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

function makeGit(d, root) {
  return (args, { okStatuses = [0] } = {}) => {
    const r = d.spawnSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER
    });
    if (r.error) throw new Error(`git ${args[0]} failed: ${r.error.message}`);
    if (!okStatuses.includes(r.status)) {
      throw new Error(`git ${args[0]} exited ${r.status}: ${String(r.stderr ?? '').split('\n')[0]}`);
    }
    return r;
  };
}

// Parses `--flag value` pairs; an unknown flag, a missing value, or a positional when `positional` is false is a usage error.
function parseFlags(argv, names, positional = false) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      if (!names.includes(token)) throw new UsageError(`unknown flag ${token.slice(0, 40)}`);
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) throw new UsageError(`${token} needs a value`);
      flags[token] = value;
    } else if (positional) rest.push(token);
    else throw new UsageError(`unexpected argument ${token.slice(0, 40)}`);
  }
  return { flags, rest };
}

function safeRelPath(path) {
  return (
    path !== '' &&
    !isAbsolute(path) &&
    !/^[A-Za-z]:/.test(path) &&
    !path.startsWith('-') &&
    !path.split('/').includes('..')
  );
}

function verifyRef(git, ref) {
  if (ref.startsWith('-')) throw new UsageError('a ref must not start with -');
  if (git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { okStatuses: [0, 1] }).status !== 0)
    throw new Error(`unknown ref: ${ref.slice(0, 80)}`);
}

// The bundled schema is the single source of truth for the enums and the findings validation.
function loadSchema(d) {
  return JSON.parse(d.readFileSync(d.schemaPath, 'utf8'));
}

// The text of `file`, or null when it does not exist.
function readIfPresent(d, file) {
  try {
    return d.readFileSync(file, 'utf8');
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
    return null;
  }
}

function readJson(d, file, label) {
  let text;
  try {
    text = d.readFileSync(file, 'utf8');
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
    throw new Error(`${label} not found in the run dir`, { cause: err });
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err;
    throw new Error(`${label} is not valid JSON`, { cause: err });
  }
}

// init: creates the next run dir `<root>/.cdk-security-audit/run-<n>`, git-ignored through a self-ignoring `.gitignore`, and writes `scope.json`. It refuses a run dir git does not ignore and a `.gitignore` that is not a regular file.
export function init(argv, d) {
  const { flags, rest } = parseFlags(argv, ['--root', '--profile', '--range'], true);
  const rootArg = flags['--root'];
  if (!rootArg || !isAbsolute(rootArg)) throw new UsageError('init needs --root <abs>');
  const profiles = loadSchema(d).properties.profile.enum;
  const profile = flags['--profile'] ?? 'standard';
  if (!profiles.includes(profile)) throw new UsageError(`--profile must be ${profiles.join('|')}`);
  const rangeArg = flags['--range'];
  const refs = rangeArg === undefined ? null : rangeArg.split('..');
  if (refs && (rangeArg.includes('...') || refs.length !== 2 || !refs[0] || !refs[1]))
    throw new UsageError('--range must be <a>..<b>');
  const normal = rest.map((p) => p.replace(/\/+$/, '').replace(/^(?:\.\/)+/, ''));
  if (!normal.every((p) => p === '.' || safeRelPath(p)))
    throw new UsageError('a path must be repo-relative with no .. segment');
  const named = normal.filter((p) => p !== '.');
  const paths = normal.includes('.') ? [] : normal;
  const git = makeGit(d, rootArg);
  const root = d.realpathSync(rootArg);
  if (d.realpathSync(git(['rev-parse', '--show-toplevel']).stdout.trim()) !== root)
    throw new Error('--root is not the repository top level');
  if (refs) refs.forEach((ref) => verifyRef(git, ref));
  const head = git(['rev-parse', 'HEAD']).stdout.trim();
  if (refs && git(['rev-parse', `${refs[1]}^{commit}`]).stdout.trim() !== head)
    throw new UsageError(`--range ${refs[1].slice(0, 80)} must resolve to HEAD`);
  // A symlink that leaves the repo, enters `.git`, or points at a secret-named file is hidden like a secret-named file.
  const isHiddenLink = (f) => {
    let target;
    try {
      target = d.realpathSync(join(root, f));
    } catch (err) {
      if (!HIDING_CODES.includes(err?.code)) throw err;
      return true;
    }
    return !under(target, root) || under(target, join(root, '.git')) || isSensitive(target);
  };
  const entries = git(['ls-files', '-z'])
    .stdout.split('\0')
    .filter(Boolean)
    .filter((f) => !under(f, RUN_BASE))
    .map((f) => ({ f, stat: d.lstatSync(join(root, f), { throwIfNoEntry: false }) }))
    .filter(({ stat }) => stat && (stat.isFile() || stat.isSymbolicLink()));
  const hidden = new Set(entries.filter(({ f, stat }) => stat.isSymbolicLink() && isHiddenLink(f)).map(({ f }) => f));
  const tracked = entries.map(({ f }) => f).sort(byteSort);
  for (const p of named)
    if (!tracked.some((f) => under(f, p))) throw new UsageError(`path matches no tracked file: ${p.slice(0, 80)}`);
  const matched = paths.length ? tracked.filter((f) => paths.some((p) => under(f, p))) : tracked;
  // Secret-named files are listed apart from the scope, so no hunt reads them and the report still names them.
  const isHidden = (f) => isSensitive(f) || hidden.has(f);
  const sensitive = matched.filter(isHidden);
  const candidates = matched.filter((f) => !isHidden(f));
  let files = candidates;
  let outOfScope = [];
  if (refs) {
    const changed = new Set(git(['diff', '--name-only', '-z', `${refs[0]}...${refs[1]}`, '--']).stdout.split('\0'));
    files = candidates.filter((f) => changed.has(f));
    outOfScope = candidates.filter((f) => !changed.has(f));
  }
  const runBase = join(root, RUN_BASE);
  const baseExisted = d.lstatSync(runBase, { throwIfNoEntry: false }) !== undefined;
  d.mkdirSync(runBase, { recursive: true });
  if (d.realpathSync(runBase) !== runBase) throw new Error('unsafe run dir: it resolves outside the repo root');
  const ignoreFile = join(runBase, '.gitignore');
  const stat = d.lstatSync(ignoreFile, { throwIfNoEntry: false });
  if (stat && !stat.isFile()) throw new Error('unsafe run dir: .gitignore is not a regular file');
  const prior = stat ? readIfPresent(d, ignoreFile) : null;
  d.writeFileSync(ignoreFile, '*\n');
  // Undo what this call created so a refused or failed run leaves the repo as it was.
  const undo = () => {
    if (prior !== null) d.writeFileSync(ignoreFile, prior);
    else {
      d.rmSync(ignoreFile);
      if (!baseExisted) d.rmdirSync(runBase);
    }
  };
  // Keeps the original error first and names a failed cleanup in its message, so the stop text stays intact.
  const failAfterUndo = (err) => {
    try {
      undo();
    } catch (undoErr) {
      err.message += ` (undo also failed: ${String(undoErr?.message ?? undoErr).split('\n')[0]})`;
    }
    return err;
  };
  let ignored;
  try {
    ignored = git(['check-ignore', '-q', '--', `${RUN_BASE}/`], { okStatuses: [0, 1] }).status === 0;
  } catch (err) {
    throw failAfterUndo(err);
  }
  if (!ignored) throw failAfterUndo(new Error('run dir is not ignored by git'));
  const numbers = d
    .readdirSync(runBase)
    .map((n) => /^run-(\d+)$/.exec(n))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  const run = join(runBase, `run-${Math.max(0, ...numbers) + 1}`);
  d.mkdirSync(run);
  const range = rangeArg ?? null;
  const scope = { root, head, profile, range, paths, files, out_of_scope: outOfScope, sensitive };
  d.writeFileSync(join(run, 'scope.json'), `${JSON.stringify(scope, null, 2)}\n`);
  return {
    ok: true,
    run,
    head,
    profile,
    range,
    files: files.length,
    out_of_scope: outOfScope.length,
    sensitive: sensitive.length
  };
}

// The real path of `--run`, which must be a `<root>/.cdk-security-audit/run-<n>` dir.
function resolveRun(d, flags) {
  const runArg = flags['--run'];
  if (!runArg || !isAbsolute(runArg)) throw new UsageError('needs --run <abs>');
  const run = d.realpathSync(runArg);
  if (basename(dirname(run)) !== RUN_BASE || !/^run-\d+$/.test(basename(run)))
    throw new Error(`--run is not a <root>/${RUN_BASE}/run-<n> dir`);
  return run;
}

// Reads `scope.json` and checks it names the repo that holds the run dir.
function readScope(d, run) {
  const scope = readJson(d, join(run, 'scope.json'), 'scope.json');
  if (scope.root !== dirname(dirname(run))) throw new Error('scope.json root does not match the run dir');
  return scope;
}

function unitErrors(unit, index) {
  const id = typeof unit?.coverage_id === 'string' ? unit.coverage_id : null;
  const fail = (message) => ({ rule: 'L0', id, message: `unit ${index}: ${message}` });
  if (typeOf(unit) !== 'object') return [fail('not an object')];
  const errors = [];
  if (!id) errors.push(fail('coverage_id must be a non-empty string'));
  for (const key of ['paths', 'entry_points', 'sinks'])
    if (!isStrings(unit[key])) errors.push(fail(`${key} must be an array of strings`));
  if (unit.wave !== null && !Number.isInteger(unit.wave)) errors.push(fail('wave must be an integer or null'));
  return errors;
}

// Reads `ledger.json` and returns its units array.
function readLedger(d, run) {
  const doc = readJson(d, join(run, 'ledger.json'), 'ledger.json');
  if (!Array.isArray(doc?.units)) throw new Error('ledger.json needs a units array');
  return doc.units;
}

// ledger: checks `ledger.json` against `scope.json` (L0 malformed unit, L1 duplicate id, L2 coverage enum, L3 file not in exactly one unit, L4 covered/deferred unit cap, L5 path outside scope, L6 out-of-scope path in no out_of_scope unit).
export function ledger(argv, d) {
  const run = resolveRun(d, parseFlags(argv, ['--run']).flags);
  const coverage = loadSchema(d).$defs.coverage.enum;
  const scope = readScope(d, run);
  const units = readLedger(d, run);
  const errors = units.flatMap(unitErrors);
  const seen = new Set();
  for (const unit of units) {
    if (typeOf(unit) !== 'object') continue;
    if (typeof unit.coverage_id === 'string' && unit.coverage_id) {
      if (seen.has(unit.coverage_id))
        errors.push({ rule: 'L1', id: unit.coverage_id, message: `duplicate coverage_id ${unit.coverage_id}` });
      seen.add(unit.coverage_id);
    }
    if (!coverage.includes(unit.coverage))
      errors.push({ rule: 'L2', id: unit.coverage_id ?? null, message: `coverage must be ${coverage.join('|')}` });
  }
  const owners = new Map();
  for (const u of units)
    for (const p of new Set(isStrings(u?.paths) ? u.paths : [])) owners.set(p, (owners.get(p) ?? 0) + 1);
  for (const file of scope.files) {
    const n = owners.get(file) ?? 0;
    if (n === 0) errors.push({ rule: 'L3', id: file, message: `${file} is in no unit's paths` });
    else if (n > 1)
      errors.push({ rule: 'L3', id: file, message: `${file} is in ${n} units' paths; it belongs to exactly one` });
  }
  const inScope = new Set(scope.files);
  const outside = new Set(scope.out_of_scope ?? []);
  for (const unit of units) {
    if (typeOf(unit) !== 'object' || !isStrings(unit.paths)) continue;
    for (const path of unit.paths)
      if (!inScope.has(path) && !(unit.coverage === 'out_of_scope' && outside.has(path)))
        errors.push({
          rule: 'L5',
          id: unit.coverage_id ?? null,
          message: `${path} is outside the scope for coverage ${unit.coverage}`
        });
  }
  const heldOut = new Set(units.flatMap((u) => (u?.coverage === 'out_of_scope' && isStrings(u.paths) ? u.paths : [])));
  for (const path of outside)
    if (!heldOut.has(path))
      errors.push({ rule: 'L6', id: path, message: `${path} is in no out_of_scope unit's paths` });
  const counted = units.filter((u) => u?.coverage !== 'out_of_scope').length;
  if (counted > MAX_UNITS)
    errors.push({ rule: 'L4', id: null, message: `${counted} covered or deferred units; the cap is ${MAX_UNITS}` });
  return errors.length ? { ok: false, errors } : { ok: true, units: units.length };
}

function recordErrors(record, ctx) {
  const id = typeof record.id === 'string' ? record.id : null;
  const fail = (rule, message) => ({ rule, id, message });
  const errors = [];
  if (id !== null) {
    if (ctx.ids.has(id)) errors.push(fail('F2', `duplicate id ${id}`));
    ctx.ids.add(id);
  }
  const confirmed = record.verdict === 'confirmed';
  if (confirmed !== (record.severity !== null && record.severity !== undefined))
    errors.push(fail('F3', 'severity must be set exactly when the verdict is confirmed'));
  if (!(confirmed ? ['fixed', 'open'] : ['not_applicable']).includes(record.fix_status))
    errors.push(fail('F4', 'fix_status must be fixed or open when confirmed, else not_applicable'));
  if (!ctx.units.has(record.coverage_id)) errors.push(fail('F5', 'coverage_id is not in ledger.json'));
  if (typeof record.file === 'string') {
    if (!safeRelPath(record.file)) errors.push(fail('F6', 'file must be repo-relative with no .. segment'));
    else if (!ctx.files.has(record.file)) errors.push(fail('F6', 'file is not in scope.json files'));
  }
  const hasFix = String(record.fix ?? '').trim() !== '';
  const hasTest = String(record.regression_test ?? '').trim() !== '';
  if (confirmed && !(hasFix && hasTest))
    errors.push(fail('F7', 'a confirmed finding needs a fix and a regression_test'));
  else if (!confirmed && (hasFix || hasTest))
    errors.push(fail('F7', 'fix and regression_test must be empty unless confirmed'));
  if (typeof record.evidence === 'string' && record.evidence.trimEnd().split('\n').length > MAX_EVIDENCE_LINES)
    errors.push(fail('F8', `evidence is longer than ${MAX_EVIDENCE_LINES} lines`));
  return errors;
}

// findings: checks `findings.json` against the schema (F1) and the cross-field rules F2 to F9.
export function findings(argv, d) {
  const run = resolveRun(d, parseFlags(argv, ['--run']).flags);
  const schema = loadSchema(d);
  const scope = readScope(d, run);
  const units = readLedger(d, run);
  const doc = readJson(d, join(run, 'findings.json'), 'findings.json');
  const errors = validateSchema(doc, schema, '$', []).map((e) => {
    const index = /^\$\.findings\[(\d+)\]/.exec(e.path)?.[1];
    const id = index === undefined ? undefined : doc.findings[Number(index)]?.id;
    return { rule: 'F1', id: typeof id === 'string' ? id : null, message: e.message };
  });
  const ctx = {
    ids: new Set(),
    units: new Set(units.map((u) => u?.coverage_id)),
    files: new Set(scope.files)
  };
  if (typeOf(doc) === 'object')
    for (const key of ['root', 'head', 'profile', 'range'])
      if (Object.hasOwn(doc, key) && doc[key] !== scope[key])
        errors.push({ rule: 'F9', id: null, message: `${key} does not match scope.json` });
  const records = Array.isArray(doc?.findings) ? doc.findings.filter((r) => typeOf(r) === 'object') : [];
  for (const record of records) errors.push(...recordErrors(record, ctx));
  return errors.length ? { ok: false, errors } : { ok: true, findings: records.length };
}

const COMMANDS = { init, ledger, findings };

// CLI body; returns the exit code (0 ok, 1 bad records, 2 usage).
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (!Object.hasOwn(COMMANDS, argv[0])) {
    d.error(
      'usage: audit-records.mjs init --root <abs> [--profile p] [--range a..b] [path ...] | ledger --run <abs> | findings --run <abs>'
    );
    return 2;
  }
  let result;
  try {
    result = COMMANDS[argv[0]](argv.slice(1), d);
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    d.error(`usage: audit-records.mjs ${argv[0]}: ${err.message}`);
    return 2;
  }
  d.log(JSON.stringify(result));
  return result.ok ? 0 : 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'audit-records');
