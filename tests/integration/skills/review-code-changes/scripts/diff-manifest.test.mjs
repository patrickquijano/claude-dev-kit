import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
  'review-code-changes',
  'scripts',
  'diff-manifest.mjs'
);
const dirs = [];
const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 30_000, env });
const runRaw = (...args) => execFileSync('node', [script, ...args], { encoding: 'utf8', timeout: 30_000, env });
const run = (...args) => JSON.parse(runRaw(...args));

function makeRepo(config = []) {
  const root = mkdtempSync(join(tmpdir(), 'rcc-repo-'));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 't@example.com');
  git(root, 'config', 'user.name', 't');
  git(root, 'config', 'commit.gpgsign', 'false');
  for (const [key, value] of config) git(root, 'config', key, value);
  writeFileSync(join(root, 'tracked.txt'), 'one\ntwo\nthree\n');
  writeFileSync(join(root, 'staged.txt'), 'a\n');
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'init');
  writeFileSync(join(root, 'tracked.txt'), 'one\nTWO\nthree\n');
  writeFileSync(join(root, 'staged.txt'), 'a\nb\n');
  git(root, 'add', 'staged.txt');
  mkdirSync(join(root, 'sub'));
  writeFileSync(join(root, 'sub', 'new.txt'), 'fresh\n');
  return root;
}

// A scratch directory next to the repo, removed with the other temp dirs.
function makeScratchDir(root, tag) {
  const scratch = join(root, '..', `${Date.now()}-${tag}`);
  dirs.push(scratch);
  return scratch;
}

// Runs `scope`, then writes `tracked.txt` as the only planned path.
function scopeWithPlan(root, scratch) {
  run('scope', '--root', root, '--scratch', scratch);
  const paths = join(scratch, 'paths.txt');
  writeFileSync(paths, 'tracked.txt\n');
  return paths;
}

after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('diff-manifest scope', () => {
  let root;
  before(() => {
    root = makeRepo();
  });

  test('lists tracked, staged, and untracked files with hunks', () => {
    // Arrange
    const scratch = makeScratchDir(root, 's1');
    // Act
    const out = run('scope', '--root', root, '--scratch', scratch);
    // Assert
    assert.deepEqual(
      out.files.map((f) => [f.path, f.hunks.length]),
      [
        ['staged.txt', 1],
        ['sub/new.txt', 1],
        ['tracked.txt', 1]
      ]
    );
  });

  test('gives byte-identical JSON on two runs', () => {
    // Arrange
    const scratch = makeScratchDir(root, 's2');
    const args = ['scope', '--root', root, '--scratch', scratch];
    const first = runRaw(...args);
    // Act
    const second = runRaw(...args);
    // Assert
    assert.equal(second, first);
  });

  test('uses HEAD as the base on the default branch', () => {
    // Arrange
    const scratch = makeScratchDir(root, 's3');
    // Act
    const out = run('scope', '--root', root, '--scratch', scratch);
    // Assert
    assert.equal(out.base, out.head);
  });

  test('skips an untracked .env and never copies it into scratch', () => {
    // Arrange
    const repo = makeRepo();
    writeFileSync(join(repo, '.env'), 'SECRET=1\n');
    const scratch = makeScratchDir(repo, 's4');
    // Act
    const out = run('scope', '--root', repo, '--scratch', scratch);
    // Assert
    assert.deepEqual(
      [out.skipped.filter((s) => s.path === '.env'), existsSync(join(scratch, 'head', '.env'))],
      [[{ path: '.env', reason: 'sensitive' }], false]
    );
  });

  test('reports a clean tree as no files', () => {
    // Arrange
    const clean = mkdtempSync(join(tmpdir(), 'rcc-clean-'));
    dirs.push(clean);
    git(clean, 'init', '-q', '-b', 'main');
    git(clean, 'config', 'user.email', 't@example.com');
    git(clean, 'config', 'user.name', 't');
    git(clean, 'config', 'commit.gpgsign', 'false');
    writeFileSync(join(clean, 'a.txt'), 'x\n');
    git(clean, 'add', '.');
    git(clean, 'commit', '-q', '-m', 'init');
    // Act
    const out = run('scope', '--root', clean);
    // Assert
    dirs.push(out.scratch);
    assert.deepEqual(out.files, []);
  });
});

describe('diff-manifest snapshot and delta', () => {
  let root;
  before(() => {
    root = makeRepo();
  });

  test('reports the path and hunks of an edit made after the snapshot', () => {
    // Arrange
    const scratch = makeScratchDir(root, 'd1');
    const paths = scopeWithPlan(root, scratch);
    run('snapshot', '--root', root, '--scratch', scratch, '--paths', paths);
    writeFileSync(join(root, 'tracked.txt'), 'one\nTWO\nthree\nfour\n');
    // Act
    const out = run('delta', '--root', root, '--scratch', scratch, '--paths', paths, '--round', '1');
    // Assert
    assert.deepEqual(
      out.files.map((f) => [f.path, f.hunks]),
      [['tracked.txt', [{ id: 'tracked.txt:1', newStart: 1, newLines: 4 }]]]
    );
  });

  test('skips a path under a symlinked directory that points outside the repo', () => {
    // Arrange
    const repo = makeRepo();
    const outside = mkdtempSync(join(tmpdir(), 'rcc-outside-'));
    dirs.push(outside);
    writeFileSync(join(outside, 'x.txt'), 'secret\n');
    symlinkSync(outside, join(repo, 'link'));
    const scratch = makeScratchDir(repo, 'd3');
    run('scope', '--root', repo, '--scratch', scratch);
    const paths = join(scratch, 'paths.txt');
    writeFileSync(paths, 'link/x.txt\n');
    // Act
    const out = run('delta', '--root', repo, '--scratch', scratch, '--paths', paths, '--round', '1');
    // Assert
    assert.deepEqual(
      [out.skipped, existsSync(join(scratch, 'head', 'link', 'x.txt'))],
      [[{ path: 'link/x.txt', reason: 'outside root' }], false]
    );
  });

  test('diffs a file created after the snapshot recorded it as absent', () => {
    // Arrange
    const repo = makeRepo();
    const scratch = makeScratchDir(repo, 'd4');
    run('scope', '--root', repo, '--scratch', scratch);
    const paths = join(scratch, 'paths.txt');
    writeFileSync(paths, 'late.txt\n');
    run('snapshot', '--root', repo, '--scratch', scratch, '--paths', paths);
    writeFileSync(join(repo, 'late.txt'), 'new\n');
    // Act
    const out = run('delta', '--root', repo, '--scratch', scratch, '--paths', paths, '--round', '1');
    // Assert
    assert.deepEqual(
      out.files.map((f) => f.path),
      ['late.txt']
    );
  });

  test('excludes an existing file that was never snapshotted', () => {
    // Arrange
    const scratch = makeScratchDir(root, 'd5');
    const paths = scopeWithPlan(root, scratch);
    // Act
    const out = run('delta', '--root', root, '--scratch', scratch, '--paths', paths, '--round', '1');
    // Assert
    assert.deepEqual([out.files, out.skipped], [[], [{ path: 'tracked.txt', reason: 'not snapshotted' }]]);
  });

  test('reports no files when nothing changed since the snapshot', () => {
    // Arrange
    const scratch = makeScratchDir(root, 'd2');
    const paths = scopeWithPlan(root, scratch);
    run('snapshot', '--root', root, '--scratch', scratch, '--paths', paths);
    // Act
    const out = run('delta', '--root', root, '--scratch', scratch, '--paths', paths, '--round', '1');
    // Assert
    assert.deepEqual([out.files, out.batches], [[], []]);
  });
});

describe('diff-manifest verify', () => {
  let root;
  before(() => {
    root = makeRepo();
  });

  test('is ok right after scope', () => {
    // Arrange
    const scratch = makeScratchDir(root, 'v1');
    const paths = scopeWithPlan(root, scratch);
    // Act
    const out = run('verify', '--root', root, '--scratch', scratch, '--paths', paths);
    // Assert
    assert.deepEqual([out.ok, out.drifted], [true, []]);
  });

  test('reports drift after the file is edited', () => {
    // Arrange
    const scratch = makeScratchDir(root, 'v2');
    const paths = scopeWithPlan(root, scratch);
    writeFileSync(join(root, 'tracked.txt'), 'edited\n');
    // Act
    const out = run('verify', '--root', root, '--scratch', scratch, '--paths', paths);
    // Assert
    assert.deepEqual([out.ok, out.drifted], [false, [{ path: 'tracked.txt', reason: 'changed since review' }]]);
  });
});

describe('diff-manifest with diff.mnemonicPrefix', () => {
  let root;
  before(() => {
    root = makeRepo([['diff.mnemonicPrefix', 'true']]);
  });

  test('keeps the manifest paths correct', () => {
    // Arrange
    const scratch = makeScratchDir(root, 'm1');
    // Act
    const out = run('scope', '--root', root, '--scratch', scratch);
    // Assert
    assert.deepEqual(
      out.files.map((f) => f.path),
      ['staged.txt', 'sub/new.txt', 'tracked.txt']
    );
  });
});
