import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';
import { findings, init, ledger, main } from '../../../../../skills/audit-code-security/scripts/audit-records.mjs';

const schema = createRequire(import.meta.url)('../../../../../skills/audit-code-security/assets/report-schema.json');
const SCHEMA_PATH = '/asset/report-schema.json';

const BASE = '/repo/.cdk-security-audit';
const RUN = `${BASE}/run-1`;
const enoent = () => Object.assign(new Error('missing'), { code: 'ENOENT' });

// Stubbed git: `tracked` is the ls-files list, `changed` the diff list, `bad` the refs that do not resolve, `calls` records each args array.
const gitStub =
  ({ tracked = [], changed = [], bad = [], top = '/repo', ignored = true, calls = [] } = {}) =>
  (cmd, args) => {
    assert.equal(cmd, 'git');
    calls.push(args);
    const out = (stdout, status = 0) => ({ status, stdout, stderr: '' });
    if (args[0] === 'ls-files') return out(tracked.map((f) => `${f}\0`).join(''));
    if (args[0] === 'check-ignore') return out('', ignored ? 0 : 1);
    if (args[0] === 'diff') return out(changed.map((f) => `${f}\0`).join(''));
    if (args.includes('--show-toplevel')) return out(`${top}\n`);
    if (args.includes('--verify')) return out('', bad.some((r) => args.at(-1).startsWith(r)) ? 1 : 0);
    return out('abc\n');
  };

// Stubbed fs: `links` maps realpath results, `kinds` maps a path to `file` or another kind for lstatSync.
const fsStub = (files = {}, existing = [], links = {}, kinds = {}) => {
  const written = {};
  const made = [];
  return {
    written,
    made,
    schemaPath: SCHEMA_PATH,
    readFileSync: (p) => {
      if (p in files) return files[p];
      if (p === SCHEMA_PATH) return JSON.stringify(schema);
      throw enoent();
    },
    writeFileSync: (p, t) => {
      written[p] = t;
    },
    mkdirSync: (p) => made.push(p),
    readdirSync: () => existing,
    realpathSync: (p) => links[p] ?? p,
    lstatSync: (p) => (p in kinds ? { isFile: () => kinds[p] === 'file' } : undefined)
  };
};

const deps = (git, fs) => ({ spawnSync: git, ...fs });

const record = (over = {}) => ({
  id: 'SA-001',
  coverage_id: 'u1',
  file: 'src/a.js',
  line: 3,
  actor: 'anonymous user',
  input: 'query string',
  boundary: 'network',
  impact: 'command execution',
  evidence: 'exec(name)',
  verdict: 'confirmed',
  severity: 'high',
  refutation: 'no guard found',
  fix: 'use execFile',
  regression_test: 'request with a;id runs one command',
  fix_status: 'open',
  ...over
});

const doc = (records) => ({ root: '/repo', head: 'abc', profile: 'standard', range: null, findings: records });
const scope = {
  root: '/repo',
  head: 'abc',
  profile: 'standard',
  range: null,
  files: ['src/a.js', 'src/b.js'],
  out_of_scope: ['docs/x.md']
};
const unit = (over = {}) => ({
  coverage_id: 'u1',
  paths: ['src/a.js', 'src/b.js'],
  entry_points: [],
  sinks: [],
  coverage: 'covered',
  wave: 1,
  ...over
});
const json = (v) => JSON.stringify(v);

const runFs = (extra = {}) =>
  fsStub({
    [`${RUN}/scope.json`]: json(scope),
    [`${RUN}/ledger.json`]: json({ units: [unit()] }),
    ...extra
  });

const rules = (result) => result.errors.map((e) => e.rule);

describe('init', () => {
  const tracked = ['src/a.js', 'src/b.js', 'docs/x.md'];

  test('writes scope.json in run-1 and reports the counts', () => {
    // Arrange
    const fs = fsStub();
    // Act
    const out = init(['--root', '/repo'], deps(gitStub({ tracked }), fs));
    // Assert
    assert.deepEqual(out, {
      ok: true,
      run: RUN,
      head: 'abc',
      profile: 'standard',
      range: null,
      files: 3,
      out_of_scope: 0
    });
    assert.deepEqual(JSON.parse(fs.written[`${RUN}/scope.json`]).files, ['docs/x.md', 'src/a.js', 'src/b.js']);
  });

  test('picks the next run number', () => {
    // Arrange
    const fs = fsStub({}, ['run-1', 'run-2', 'notes']);
    // Act
    const out = init(['--root', '/repo'], deps(gitStub({ tracked }), fs));
    // Assert
    assert.equal(out.run, `${BASE}/run-3`);
  });

  test('filters files by path prefix', () => {
    // Arrange
    const fs = fsStub();
    // Act
    const out = init(['--root', '/repo', 'src'], deps(gitStub({ tracked }), fs));
    // Assert
    assert.equal(out.files, 2);
  });

  test('puts files outside the range diff in out_of_scope', () => {
    // Arrange
    const git = gitStub({ tracked, changed: ['src/a.js'] });
    // Act
    const out = init(['--root', '/repo', '--range', 'main..HEAD'], deps(git, fsStub()));
    // Assert
    assert.deepEqual([out.files, out.out_of_scope, out.range], [1, 2, 'main..HEAD']);
  });

  test('writes a self-ignoring .gitignore in the run base', () => {
    // Arrange
    const fs = fsStub();
    // Act
    init(['--root', '/repo'], deps(gitStub({ tracked }), fs));
    // Assert
    assert.equal(fs.written[`${BASE}/.gitignore`], '*\n');
  });

  test('refuses a run base that git does not ignore', () => {
    // Arrange
    const d = deps(gitStub({ tracked, ignored: false }), fsStub());
    // Act
    const act = () => init(['--root', '/repo'], d);
    // Assert
    assert.throws(act, /not ignored by git/);
  });

  test('refuses a run base symlinked outside the repo', () => {
    // Arrange
    const d = deps(gitStub({ tracked }), fsStub({}, [], { [BASE]: '/elsewhere/audit' }));
    // Act
    const act = () => init(['--root', '/repo'], d);
    // Assert
    assert.throws(act, /unsafe run dir/);
  });

  test('refuses a --range value that starts with --', () => {
    // Arrange
    const d = deps(gitStub({ tracked }), fsStub());
    // Act
    const act = () => init(['--root', '/repo', '--range', '--output=x..HEAD'], d);
    // Assert
    assert.throws(act, /needs a value/);
  });

  test('refuses a first range side that starts with a dash', () => {
    // Arrange
    const d = deps(gitStub({ tracked }), fsStub());
    // Act
    const act = () => init(['--root', '/repo', '--range', '-x..HEAD'], d);
    // Assert
    assert.throws(act, /must not start with -/);
  });

  test('refuses --root without a value', () => {
    // Arrange
    const d = deps(gitStub({ tracked }), fsStub());
    // Act
    const act = () => init(['--root'], d);
    // Assert
    assert.throws(act, /needs a value/);
  });

  test('refuses --range followed by another flag', () => {
    // Arrange
    const d = deps(gitStub({ tracked }), fsStub());
    // Act
    const act = () => init(['--root', '/repo', '--range', '--profile'], d);
    // Assert
    assert.throws(act, /needs a value/);
  });

  test('refuses a --range without two dots', () => {
    // Arrange
    const d = deps(gitStub({ tracked }), fsStub());
    // Act
    const act = () => init(['--root', '/repo', '--range', 'main'], d);
    // Assert
    assert.throws(act, /--range must be/);
  });

  test('refuses a --range with an empty first side', () => {
    // Arrange
    const d = deps(gitStub({ tracked }), fsStub());
    // Act
    const act = () => init(['--root', '/repo', '--range', '..HEAD'], d);
    // Assert
    assert.throws(act, /--range must be/);
  });

  test('refuses a three-dot --range', () => {
    // Arrange
    const d = deps(gitStub({ tracked }), fsStub());
    // Act
    const act = () => init(['--root', '/repo', '--range', 'a...b'], d);
    // Assert
    assert.throws(act, /--range must be/);
  });

  test('takes the profile enum from the schema read through deps', () => {
    // Arrange
    const stub = json({ properties: { profile: { enum: ['x'] } } });
    const d = deps(gitStub({ tracked }), fsStub({ [SCHEMA_PATH]: stub }));
    // Act
    const out = init(['--root', '/repo', '--profile', 'x'], d);
    // Assert
    assert.equal(out.profile, 'x');
  });

  test('refuses a dash-prefixed ref given as the second range side', () => {
    // Arrange
    const d = deps(gitStub({ tracked }), fsStub());
    // Act
    const act = () => init(['--root', '/repo', '--range', 'main..-x'], d);
    // Assert
    assert.throws(act, /must not start with -/);
  });

  test('refuses an unknown ref', () => {
    // Arrange
    const d = deps(gitStub({ tracked, bad: ['nope'] }), fsStub());
    // Act
    const act = () => init(['--root', '/repo', '--range', 'nope..HEAD'], d);
    // Assert
    assert.throws(act, /unknown ref/);
  });

  test('refuses a relative root', () => {
    // Arrange
    const d = deps(gitStub({ tracked }), fsStub());
    // Act
    const act = () => init(['--root', 'repo'], d);
    // Assert
    assert.throws(act, /--root/);
  });

  test('refuses a bad profile', () => {
    // Arrange
    const d = deps(gitStub({ tracked }), fsStub());
    // Act
    const act = () => init(['--root', '/repo', '--profile', 'fast'], d);
    // Assert
    assert.throws(act, /--profile/);
  });

  test('refuses a symlinked .gitignore and writes nothing', () => {
    // Arrange
    const fs = fsStub({}, [], {}, { [`${BASE}/.gitignore`]: 'symlink' });
    // Act
    const act = () => init(['--root', '/repo'], deps(gitStub({ tracked }), fs));
    // Assert
    assert.throws(act, /not a regular file/);
    assert.deepEqual(fs.written, {});
  });

  test('overwrites an existing regular .gitignore', () => {
    // Arrange
    const fs = fsStub({}, [], {}, { [`${BASE}/.gitignore`]: 'file' });
    // Act
    init(['--root', '/repo'], deps(gitStub({ tracked }), fs));
    // Assert
    assert.equal(fs.written[`${BASE}/.gitignore`], '*\n');
  });

  test('strips a leading ./ from a path', () => {
    // Arrange
    const d = deps(gitStub({ tracked }), fsStub());
    // Act
    const out = init(['--root', '/repo', './src'], d);
    // Assert
    assert.equal(out.files, 2);
  });

  test('treats . as the whole repo with empty scope.paths', () => {
    // Arrange
    const fs = fsStub();
    // Act
    const out = init(['--root', '/repo', '.'], deps(gitStub({ tracked }), fs));
    // Assert
    assert.deepEqual([out.files, JSON.parse(fs.written[`${RUN}/scope.json`]).paths], [3, []]);
  });

  test('keeps . winning next to a tracked path', () => {
    // Arrange
    const fs = fsStub();
    // Act
    const out = init(['--root', '/repo', '.', 'src'], deps(gitStub({ tracked }), fs));
    // Assert
    assert.deepEqual([out.files, JSON.parse(fs.written[`${RUN}/scope.json`]).paths], [3, []]);
  });

  test('refuses a path that matches no tracked file', () => {
    // Arrange
    const d = deps(gitStub({ tracked }), fsStub());
    // Act
    const act = () => init(['--root', '/repo', 'nope'], d);
    // Assert
    assert.throws(act, /matches no tracked file/);
  });

  test('diffs a range from the merge base with three dots', () => {
    // Arrange
    const calls = [];
    const d = deps(gitStub({ tracked, changed: ['src/a.js'], calls }), fsStub());
    // Act
    init(['--root', '/repo', '--range', 'main..HEAD'], d);
    // Assert
    assert.ok(calls.some((args) => args[0] === 'diff' && args.includes('main...HEAD')));
  });

  test('refuses a root that is not the repository top level', () => {
    // Arrange
    const d = deps(gitStub({ tracked, top: '/other' }), fsStub());
    // Act
    const act = () => init(['--root', '/repo'], d);
    // Assert
    assert.throws(act, /top level/);
  });

  test('refuses a path with a .. segment', () => {
    // Arrange
    const d = deps(gitStub({ tracked }), fsStub());
    // Act
    const act = () => init(['--root', '/repo', '../etc'], d);
    // Assert
    assert.throws(act, /repo-relative/);
  });
});

describe('ledger', () => {
  const bare = json({ ...scope, out_of_scope: [] });
  const check = (units, extra) =>
    ledger(
      ['--run', RUN],
      deps(null, runFs({ [`${RUN}/scope.json`]: bare, [`${RUN}/ledger.json`]: json({ units }), ...extra }))
    );
  const withScope = { [`${RUN}/scope.json`]: json(scope) };

  test('accepts a ledger that covers every scope file', () => {
    // Arrange
    const units = [unit()];
    // Act
    const out = check(units);
    // Assert
    assert.deepEqual(out, { ok: true, units: 1 });
  });

  test('accepts a deferred unit', () => {
    // Arrange
    const units = [unit({ coverage: 'deferred', wave: null })];
    // Act
    const out = check(units);
    // Assert
    assert.equal(out.ok, true);
  });

  test('L1 flags a duplicate coverage_id', () => {
    // Arrange
    const units = [unit(), unit()];
    // Act
    const out = check(units);
    // Assert
    assert.deepEqual(rules(out), ['L1']);
  });

  test('L2 flags a coverage value outside the enum', () => {
    // Arrange
    const units = [unit({ coverage: 'half' })];
    // Act
    const out = check(units);
    // Assert
    assert.deepEqual(rules(out), ['L2']);
  });

  test('L3 flags a scope file in no unit', () => {
    // Arrange
    const units = [unit({ paths: ['src/a.js'] })];
    // Act
    const out = check(units);
    // Assert
    assert.deepEqual(
      out.errors.map((e) => [e.rule, e.id]),
      [['L3', 'src/b.js']]
    );
  });

  test('L4 flags more than 40 units', () => {
    // Arrange
    const units = Array.from({ length: 41 }, (_, i) => unit({ coverage_id: `u${i}` }));
    // Act
    const out = check(units);
    // Assert
    assert.ok(rules(out).includes('L4'));
  });

  test('L4 ignores out_of_scope units in the cap', () => {
    // Arrange
    const ghosts = Array.from({ length: 45 }, (_, i) => `docs/g${i}.md`);
    const units = [
      ...Array.from({ length: 40 }, (_, i) => unit({ coverage_id: `u${i}` })),
      unit({ coverage_id: 'U-OOS', paths: ghosts, coverage: 'out_of_scope', wave: null })
    ];
    // Act
    const out = check(units, { [`${RUN}/scope.json`]: json({ ...scope, out_of_scope: ghosts }) });
    // Assert
    assert.equal(out.ok, true);
  });

  test('L4 still flags 41 covered units next to a U-OOS unit', () => {
    // Arrange
    const units = [
      ...Array.from({ length: 41 }, (_, i) => unit({ coverage_id: `u${i}` })),
      unit({ coverage_id: 'U-OOS', paths: ['docs/x.md'], coverage: 'out_of_scope', wave: null })
    ];
    // Act
    const out = check(units, withScope);
    // Assert
    assert.deepEqual(rules(out), ['L4']);
  });

  test('L5 flags a covered unit holding an out_of_scope path', () => {
    // Arrange
    const units = [unit({ paths: ['src/a.js', 'src/b.js', 'docs/x.md'] })];
    // Act
    const out = check(units, withScope);
    // Assert
    assert.deepEqual(rules(out), ['L5', 'L6']);
  });

  test('L5 flags an out_of_scope unit holding a path in neither list', () => {
    // Arrange
    const units = [unit(), unit({ coverage_id: 'u2', paths: ['ghost.js'], coverage: 'out_of_scope', wave: null })];
    // Act
    const out = check(units);
    // Assert
    assert.deepEqual(rules(out), ['L5']);
  });

  test('accepts a U-OOS unit holding an out_of_scope path', () => {
    // Arrange
    const units = [unit(), unit({ coverage_id: 'U-OOS', paths: ['docs/x.md'], coverage: 'out_of_scope', wave: null })];
    // Act
    const out = check(units, withScope);
    // Assert
    assert.deepEqual(out, { ok: true, units: 2 });
  });

  test('L6 flags an out_of_scope path held by no unit', () => {
    // Arrange
    const units = [unit()];
    // Act
    const out = check(units, withScope);
    // Assert
    assert.deepEqual(
      out.errors.map((e) => [e.rule, e.id]),
      [['L6', 'docs/x.md']]
    );
  });

  test('L6 flags an out_of_scope unit that misses one of two scope paths', () => {
    // Arrange
    const two = { [`${RUN}/scope.json`]: json({ ...scope, out_of_scope: ['docs/x.md', 'docs/y.md'] }) };
    const units = [unit(), unit({ coverage_id: 'U-OOS', paths: ['docs/x.md'], coverage: 'out_of_scope', wave: null })];
    // Act
    const out = check(units, two);
    // Assert
    assert.deepEqual(rules(out), ['L6']);
  });

  test('L1 skips units whose coverage_id is missing', () => {
    // Arrange
    const units = [unit({ coverage_id: undefined }), unit({ coverage_id: undefined })];
    // Act
    const out = check(units);
    // Assert
    assert.deepEqual(rules(out), ['L0', 'L0']);
  });

  test('L0 flags a malformed unit', () => {
    // Arrange
    const units = [unit({ paths: 'src/a.js' })];
    // Act
    const out = check(units);
    // Assert
    assert.ok(rules(out).includes('L0'));
  });

  test('L0 flags a non-integer wave', () => {
    // Arrange
    const units = [unit({ wave: 'x' })];
    // Act
    const out = check(units);
    // Assert
    assert.ok(rules(out).includes('L0'));
  });

  test('L0 flags an empty coverage_id', () => {
    // Arrange
    const units = [unit({ coverage_id: '' })];
    // Act
    const out = check(units);
    // Assert
    assert.ok(rules(out).includes('L0'));
  });

  test('throws when units is not an array', () => {
    // Arrange
    const units = {};
    // Act
    const act = () => check(units);
    // Assert
    assert.throws(act, /needs a units array/);
  });

  test('throws when the run dir is outside the audit base', () => {
    // Arrange
    const d = deps(null, runFs());
    // Act
    const act = () => ledger(['--run', '/tmp/run-1'], d);
    // Assert
    assert.throws(act, /not a <root>\/\.cdk-security-audit\/run-<n> dir/);
  });

  test('throws when scope.json names another repo root', () => {
    // Arrange
    const d = deps(null, runFs({ [`${RUN}/scope.json`]: json({ ...scope, root: '/other' }) }));
    // Act
    const act = () => ledger(['--run', RUN], d);
    // Assert
    assert.throws(act, /root does not match/);
  });

  test('throws when ledger.json is missing', () => {
    // Arrange
    const d = deps(null, fsStub({ [`${RUN}/scope.json`]: json(scope) }));
    // Act
    const act = () => ledger(['--run', RUN], d);
    // Assert
    assert.throws(act, /ledger.json not found/);
  });
});

describe('findings', () => {
  const check = (records, top) =>
    findings(['--run', RUN], deps(null, runFs({ [`${RUN}/findings.json`]: json(top ?? doc(records)) })));

  test('throws when the run dir is outside the audit base', () => {
    // Arrange
    const d = deps(null, runFs());
    // Act
    const act = () => findings(['--run', '/repo/run-1'], d);
    // Assert
    assert.throws(act, /not a <root>/);
  });

  test('throws when scope.json names another repo root', () => {
    // Arrange
    const d = deps(null, runFs({ [`${RUN}/scope.json`]: json({ ...scope, root: '/other' }) }));
    // Act
    const act = () => findings(['--run', RUN], d);
    // Assert
    assert.throws(act, /root does not match/);
  });

  test('accepts a valid confirmed record', () => {
    // Arrange
    const records = [record()];
    // Act
    const out = check(records);
    // Assert
    assert.deepEqual(out, { ok: true, findings: 1 });
  });

  test('accepts a rejected and a needs_validation record', () => {
    // Arrange
    const base = { severity: null, fix_status: 'not_applicable', fix: '', regression_test: '' };
    const records = [
      record({ ...base, id: 'SA-001', verdict: 'rejected' }),
      record({ ...base, id: 'SA-002', verdict: 'needs_validation' })
    ];
    // Act
    const out = check(records);
    // Assert
    assert.equal(out.ok, true);
  });

  test('F1 flags a schema violation', () => {
    // Arrange
    const records = [record({ line: 0 })];
    // Act
    const out = check(records);
    // Assert
    assert.deepEqual(rules(out), ['F1']);
  });

  test('F1 flags a bad top-level field', () => {
    // Arrange
    const top = { ...doc([record()]), extra: 1 };
    // Act
    const out = check(null, top);
    // Assert
    assert.deepEqual(rules(out), ['F1']);
  });

  test('F1 and F9 flag a profile outside the enum', () => {
    // Arrange
    const top = { ...doc([record()]), profile: 'fast' };
    // Act
    const out = check(null, top);
    // Assert
    assert.deepEqual(rules(out), ['F1', 'F9']);
  });

  test('F9 flags a root that differs from scope.json', () => {
    // Arrange
    const top = { ...doc([record()]), root: '/other' };
    // Act
    const out = check(null, top);
    // Assert
    assert.deepEqual(rules(out), ['F9']);
  });

  test('accepts an id with four digits', () => {
    // Arrange
    const records = [record({ id: 'SA-1000' })];
    // Act
    const out = check(records);
    // Assert
    assert.equal(out.ok, true);
  });

  test('F9 flags a head that differs from scope.json', () => {
    // Arrange
    const top = { ...doc([record()]), head: 'zzz' };
    // Act
    const out = check(null, top);
    // Assert
    assert.deepEqual(rules(out), ['F9']);
  });

  test('F9 flags a range that differs from scope.json', () => {
    // Arrange
    const top = { ...doc([record()]), range: 'a..b' };
    // Act
    const out = check(null, top);
    // Assert
    assert.deepEqual(rules(out), ['F9']);
  });

  test('throws when ledger.json has no units array', () => {
    // Arrange
    const d = deps(null, runFs({ [`${RUN}/ledger.json`]: json({}), [`${RUN}/findings.json`]: json(doc([])) }));
    // Act
    const act = () => findings(['--run', RUN], d);
    // Assert
    assert.throws(act, /needs a units array/);
  });

  test('F2 flags a duplicate id', () => {
    // Arrange
    const records = [record(), record()];
    // Act
    const out = check(records);
    // Assert
    assert.deepEqual(rules(out), ['F2']);
  });

  test('F3 flags severity on a rejected record', () => {
    // Arrange
    const records = [record({ verdict: 'rejected', fix_status: 'not_applicable', fix: '', regression_test: '' })];
    // Act
    const out = check(records);
    // Assert
    assert.deepEqual(rules(out), ['F3']);
  });

  test('F3 flags a confirmed record without severity', () => {
    // Arrange
    const records = [record({ severity: null })];
    // Act
    const out = check(records);
    // Assert
    assert.deepEqual(rules(out), ['F3']);
  });

  test('F4 flags a wrong fix_status', () => {
    // Arrange
    const records = [record({ fix_status: 'not_applicable' })];
    // Act
    const out = check(records);
    // Assert
    assert.deepEqual(rules(out), ['F4']);
  });

  test('F5 flags a coverage_id missing from the ledger', () => {
    // Arrange
    const records = [record({ coverage_id: 'zz' })];
    // Act
    const out = check(records);
    // Assert
    assert.deepEqual(rules(out), ['F5']);
  });

  test('F6 flags a file outside the scope and a .. path', () => {
    // Arrange
    const records = [record({ file: 'src/c.js' }), record({ id: 'SA-002', file: '../x.js' })];
    // Act
    const out = check(records);
    // Assert
    assert.deepEqual(rules(out), ['F6', 'F6']);
  });

  test('F7 flags a confirmed record without a fix', () => {
    // Arrange
    const records = [record({ fix: ' ' })];
    // Act
    const out = check(records);
    // Assert
    assert.deepEqual(rules(out), ['F7']);
  });

  test('F7 flags a rejected record that carries a fix', () => {
    // Arrange
    const base = { severity: null, fix_status: 'not_applicable', regression_test: '' };
    const records = [record({ ...base, verdict: 'rejected', fix: 'use execFile' })];
    // Act
    const out = check(records);
    // Assert
    assert.deepEqual(rules(out), ['F7']);
  });

  test('F7 flags a needs_validation record that carries a regression_test', () => {
    // Arrange
    const base = { severity: null, fix_status: 'not_applicable', fix: '' };
    const records = [record({ ...base, verdict: 'needs_validation', regression_test: 'request runs one command' })];
    // Act
    const out = check(records);
    // Assert
    assert.deepEqual(rules(out), ['F7']);
  });

  test('F8 flags evidence over three lines', () => {
    // Arrange
    const records = [record({ evidence: 'a\nb\nc\nd' })];
    // Act
    const out = check(records);
    // Assert
    assert.deepEqual(rules(out), ['F8']);
  });

  test('throws when findings.json is not valid JSON', () => {
    // Arrange
    const d = deps(null, runFs({ [`${RUN}/findings.json`]: '{' }));
    // Act
    const act = () => findings(['--run', RUN], d);
    // Assert
    assert.throws(act, /not valid JSON/);
  });
});

describe('main', () => {
  const capture = () => {
    const out = { logs: [], errors: [] };
    return { out, log: (t) => out.logs.push(t), error: (t) => out.errors.push(t) };
  };

  test('returns 0 and prints the ok JSON', () => {
    // Arrange
    const c = capture();
    const d = { ...deps(null, runFs({ [`${RUN}/findings.json`]: json(doc([record()])) })), log: c.log, error: c.error };
    // Act
    const code = main(['findings', '--run', RUN], d);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(c.out.logs[0]), { ok: true, findings: 1 });
  });

  test('returns 1 with an errors JSON for bad records', () => {
    // Arrange
    const c = capture();
    const d = {
      ...deps(null, runFs({ [`${RUN}/findings.json`]: json(doc([record({ fix: '' })])) })),
      log: c.log,
      error: c.error
    };
    // Act
    const code = main(['findings', '--run', RUN], d);
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(c.out.logs[0]).errors[0].rule, 'F7');
  });

  test('returns 2 for . next to a path that matches no tracked file', () => {
    // Arrange
    const c = capture();
    const d = { ...deps(gitStub({ tracked: ['src/a.js'] }), fsStub()), log: c.log, error: c.error };
    // Act
    const code = main(['init', '--root', '/repo', '.', 'nope'], d);
    // Assert
    assert.equal(code, 2);
    assert.match(c.out.errors[0], /matches no tracked file/);
  });

  test('returns 2 for an unknown flag', () => {
    // Arrange
    const c = capture();
    const d = { ...deps(null, runFs()), log: c.log, error: c.error };
    // Act
    const code = main(['ledger', '--run', RUN, '--bogus', 'x'], d);
    // Assert
    assert.equal(code, 2);
    assert.match(c.out.errors[0], /unknown flag/);
  });

  test('returns 2 for an unexpected positional argument', () => {
    // Arrange
    const c = capture();
    const d = { ...deps(null, runFs()), log: c.log, error: c.error };
    // Act
    const code = main(['findings', '--run', RUN, 'extra'], d);
    // Assert
    assert.equal(code, 2);
    assert.match(c.out.errors[0], /unexpected argument/);
  });

  test('returns 2 for a three-dot range', () => {
    // Arrange
    const c = capture();
    const d = { ...deps(gitStub({ tracked: ['src/a.js'] }), fsStub()), log: c.log, error: c.error };
    // Act
    const code = main(['init', '--root', '/repo', '--range', 'a...b'], d);
    // Assert
    assert.equal(code, 2);
  });

  test('returns 2 for an unknown command', () => {
    // Arrange
    const c = capture();
    // Act
    const code = main(['nope'], { log: c.log, error: c.error });
    // Assert
    assert.equal(code, 2);
    assert.match(c.out.errors[0], /usage/);
  });

  test('returns 2 for a usage error and prints nothing on stdout', () => {
    // Arrange
    const c = capture();
    // Act
    const code = main(['ledger'], { ...deps(null, runFs()), log: c.log, error: c.error });
    // Assert
    assert.equal(code, 2);
    assert.deepEqual(c.out.logs, []);
  });

  test('rethrows a runtime error', () => {
    // Arrange
    const c = capture();
    const d = { ...deps(null, fsStub()), log: c.log, error: c.error };
    // Act
    const act = () => main(['ledger', '--run', RUN], d);
    // Assert
    assert.throws(act, /scope.json not found/);
  });
});
