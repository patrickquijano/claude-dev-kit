import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  '..',
  'skills',
  'audit-code-security',
  'scripts',
  'audit-records.mjs'
);
const dirs = [];
const tmp = (tag) => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), `acs-${tag}-`)));
  dirs.push(dir);
  return dir;
};
const gitEnv = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 30_000, env: gitEnv });

// Runs the real CLI; returns status, parsed stdout (or null), and stderr.
const cli = (...args) => {
  const r = spawnSync('node', [script, ...args], { encoding: 'utf8', timeout: 30_000, env: gitEnv });
  return { status: r.status, out: r.stdout ? JSON.parse(r.stdout) : null, err: r.stderr };
};

function makeRepo() {
  const root = tmp('repo');
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 't@example.com');
  git(root, 'config', 'user.name', 't');
  git(root, 'config', 'commit.gpgsign', 'false');
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'src', 'a.js'), 'one\n');
  writeFileSync(join(root, 'src', 'b.js'), 'two\n');
  writeFileSync(join(root, 'README.md'), 'readme\n');
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'init');
  writeFileSync(join(root, 'src', 'a.js'), 'one\nchanged\n');
  git(root, 'commit', '-q', '-am', 'change a');
  return root;
}

const record = (over = {}) => ({
  id: 'SA-001',
  coverage_id: 'u1',
  file: 'src/a.js',
  line: 1,
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

after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('audit-records init', () => {
  let root;
  before(() => {
    root = makeRepo();
  });

  test('creates run-1 then run-2 under the git-ignored .cdk-security-audit dir', () => {
    // Arrange
    const fresh = makeRepo();
    const first = cli('init', '--root', fresh);
    // Act
    const second = cli('init', '--root', fresh);
    // Assert
    assert.equal(first.status, 0);
    assert.equal(first.out.run, join(fresh, '.cdk-security-audit', 'run-1'));
    assert.equal(git(fresh, 'status', '--porcelain'), '');
    assert.equal(second.out.run.endsWith('run-2'), true);
    assert.equal(existsSync(join(second.out.run, 'scope.json')), true);
  });

  test('writes scope.json with the tracked files', () => {
    // Arrange
    const { out } = cli('init', '--root', root);
    // Act
    const scope = JSON.parse(readFileSync(join(out.run, 'scope.json'), 'utf8'));
    // Assert
    assert.deepEqual(scope.files, ['README.md', 'src/a.js', 'src/b.js']);
    assert.equal(scope.root, root);
  });

  test('lists a committed .env in sensitive and keeps it out of files', () => {
    // Arrange
    const other = makeRepo();
    writeFileSync(join(other, '.env'), 'X=1\n');
    git(other, 'add', '.env');
    git(other, 'commit', '-q', '-m', 'add env');
    // Act
    const { out } = cli('init', '--root', other);
    const scope = JSON.parse(readFileSync(join(out.run, 'scope.json'), 'utf8'));
    // Assert
    assert.deepEqual(scope.sensitive, ['.env']);
    assert.equal(scope.files.includes('.env'), false);
  });

  test('hides a committed symlink to a file outside the repo', () => {
    // Arrange
    const other = makeRepo();
    const outside = join(tmp('outside'), 'target.txt');
    writeFileSync(outside, 'data\n');
    symlinkSync(outside, join(other, 'out.txt'));
    git(other, 'add', 'out.txt');
    git(other, 'commit', '-q', '-m', 'add link');
    // Act
    const { out } = cli('init', '--root', other);
    const scope = JSON.parse(readFileSync(join(out.run, 'scope.json'), 'utf8'));
    // Assert
    assert.deepEqual(scope.sensitive, ['out.txt']);
    assert.equal(scope.files.includes('out.txt'), false);
  });

  test('hides a committed symlink to a .env file', () => {
    // Arrange
    const other = makeRepo();
    writeFileSync(join(other, '.env'), 'X=1\n');
    symlinkSync('.env', join(other, 'config.txt'));
    git(other, 'add', 'config.txt');
    git(other, 'commit', '-q', '-m', 'add link');
    // Act
    const { out } = cli('init', '--root', other);
    const scope = JSON.parse(readFileSync(join(out.run, 'scope.json'), 'utf8'));
    // Assert
    assert.equal(scope.sensitive.includes('config.txt'), true);
    assert.equal(scope.files.includes('config.txt'), false);
  });

  test('hides a committed symlink to a missing target', () => {
    // Arrange
    const other = makeRepo();
    symlinkSync('missing-target.txt', join(other, 'dangling.txt'));
    git(other, 'add', 'dangling.txt');
    git(other, 'commit', '-q', '-m', 'add link');
    // Act
    const { out } = cli('init', '--root', other);
    const scope = JSON.parse(readFileSync(join(out.run, 'scope.json'), 'utf8'));
    // Assert
    assert.deepEqual(scope.sensitive, ['dangling.txt']);
    assert.equal(scope.files.includes('dangling.txt'), false);
  });

  test('loads the bundled schema for --profile deep', () => {
    // Arrange
    const args = ['init', '--root', root, '--profile', 'deep'];
    // Act
    const { out } = cli(...args);
    // Assert
    assert.equal(out.profile, 'deep');
  });

  test('keeps run files out of scope on a second init', () => {
    // Arrange
    cli('init', '--root', root);
    // Act
    const { out } = cli('init', '--root', root);
    const scope = JSON.parse(readFileSync(join(out.run, 'scope.json'), 'utf8'));
    // Assert
    assert.equal(
      scope.files.some((f) => f.startsWith('.cdk-security-audit/')),
      false
    );
  });

  test('puts files unchanged in the range into out_of_scope', () => {
    // Arrange
    const args = ['init', '--root', root, '--range', 'HEAD~1..HEAD'];
    // Act
    const { out } = cli(...args);
    // Assert
    assert.deepEqual([out.files, out.out_of_scope], [1, 2]);
  });

  test('filters by path prefix', () => {
    // Arrange
    const args = ['init', '--root', root, 'src'];
    // Act
    const { out } = cli(...args);
    // Assert
    assert.equal(out.files, 2);
  });

  test('refuses a run base symlinked outside the repo', () => {
    // Arrange
    const other = makeRepo();
    symlinkSync(tmp('elsewhere'), join(other, '.cdk-security-audit'));
    // Act
    const r = cli('init', '--root', other);
    // Assert
    assert.equal(r.status, 1);
    assert.match(r.err, /^audit-records: unsafe run dir/);
  });

  test('refuses a symlinked .gitignore and leaves its target alone', () => {
    // Arrange
    const other = makeRepo();
    const target = join(tmp('target'), 'keep.txt');
    writeFileSync(target, 'keep\n');
    mkdirSync(join(other, '.cdk-security-audit'));
    symlinkSync(target, join(other, '.cdk-security-audit', '.gitignore'));
    // Act
    const r = cli('init', '--root', other);
    // Assert
    assert.equal(r.status, 1);
    assert.match(r.err, /not a regular file/);
    assert.equal(readFileSync(target, 'utf8'), 'keep\n');
  });

  test('diffs a range from the merge base', () => {
    // Arrange
    const other = makeRepo();
    git(other, 'checkout', '-q', '-b', 'feature');
    writeFileSync(join(other, 'src', 'b.js'), 'two\nchanged\n');
    git(other, 'commit', '-q', '-am', 'change b');
    git(other, 'checkout', '-q', 'main');
    writeFileSync(join(other, 'README.md'), 'readme\nmore\n');
    git(other, 'commit', '-q', '-am', 'change readme');
    git(other, 'checkout', '-q', 'feature');
    // Act
    const { out } = cli('init', '--root', other, '--range', 'main..HEAD');
    const scope = JSON.parse(readFileSync(join(out.run, 'scope.json'), 'utf8'));
    // Assert
    assert.deepEqual(scope.files, ['src/b.js']);
  });

  test('exits 2 for a path matching no tracked file', () => {
    // Arrange
    const args = ['init', '--root', root, 'nope'];
    // Act
    const r = cli(...args);
    // Assert
    assert.equal(r.status, 2);
  });

  test('exits 2 for . next to a path matching no tracked file', () => {
    // Arrange
    const args = ['init', '--root', root, '.', 'nope'];
    // Act
    const r = cli(...args);
    // Assert
    assert.equal(r.status, 2);
  });

  test('refuses a ref that starts with a dash with exit 2', () => {
    // Arrange
    const args = ['init', '--root', root, '--range', '-x..HEAD'];
    // Act
    const r = cli(...args);
    // Assert
    assert.equal(r.status, 2);
  });

  test('refuses an unknown ref with one stderr line and exit 1', () => {
    // Arrange
    const args = ['init', '--root', root, '--range', 'nope..HEAD'];
    // Act
    const r = cli(...args);
    // Assert
    assert.equal(r.status, 1);
    assert.equal(r.err.trim().split('\n').length, 1);
  });

  test('exits 2 on an unknown command', () => {
    // Arrange
    const args = ['bogus'];
    // Act
    const r = cli(...args);
    // Assert
    assert.equal(r.status, 2);
  });
});

describe('audit-records ledger and findings', () => {
  let run;
  before(() => {
    const root = makeRepo();
    run = cli('init', '--root', root).out.run;
    const units = [
      {
        coverage_id: 'u1',
        paths: ['README.md', 'src/a.js', 'src/b.js'],
        entry_points: [],
        sinks: [],
        coverage: 'covered',
        wave: 1
      }
    ];
    writeFileSync(join(run, 'ledger.json'), JSON.stringify({ units }));
  });

  const write = (records, over = {}) => {
    const { root, head, profile, range } = JSON.parse(readFileSync(join(run, 'scope.json'), 'utf8'));
    writeFileSync(
      join(run, 'findings.json'),
      JSON.stringify({ root, head, profile, range, findings: records, ...over })
    );
  };

  test('ledger accepts a unit covering every file', () => {
    // Arrange
    const args = ['ledger', '--run', run];
    // Act
    const r = cli(...args);
    // Assert
    assert.deepEqual([r.status, r.out], [0, { ok: true, units: 1 }]);
  });

  test('findings accepts a valid record', () => {
    // Arrange
    write([record()]);
    // Act
    const r = cli('findings', '--run', run);
    // Assert
    assert.deepEqual([r.status, r.out.ok], [0, true]);
  });

  test('findings exits 1 with an errors JSON for a bad record', () => {
    // Arrange
    write([record({ severity: null })]);
    // Act
    const r = cli('findings', '--run', run);
    // Assert
    assert.equal(r.status, 1);
    assert.deepEqual(
      r.out.errors.map((e) => e.rule),
      ['F3']
    );
    assert.equal(r.err, '');
  });

  test('findings exits 2 without --run', () => {
    // Arrange
    const args = ['findings'];
    // Act
    const r = cli(...args);
    // Assert
    assert.equal(r.status, 2);
  });

  test('findings refuses a run dir outside the audit base', () => {
    // Arrange
    const outside = tmp('outside');
    // Act
    const r = cli('findings', '--run', outside);
    // Assert
    assert.equal(r.status, 1);
    assert.match(r.err, /not a <root>/);
  });
});
