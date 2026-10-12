import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BUDGET,
  chunks,
  fingerprint,
  formatLintRepo,
  groupFiles,
  list,
  pathspecs,
  runStep
} from '../../../../../hooks/scripts/lib/format-lint-repo.mjs';

const out = (text = '', status = 0) => ({ status, stdout: Buffer.from(text), stderr: Buffer.from('') });
// Fake git: `diff` text, untracked files (`ls-files -o`), and tracked+untracked files (`ls-files -co`).
const fakeGit =
  ({ diff = '', untracked = [], all = [], status = 0 } = {}) =>
  (cwd, args) => {
    if (args[0] === 'diff') return out(diff, status);
    if (args[0] === 'ls-files') return out((args[1] === '-o' ? untracked : all).map((f) => `${f}\0`).join(''), status);
    return out('', 1);
  };
const ok = { status: 0, stdout: '', stderr: '' };
const baseDeps = (over = {}) => ({
  git: fakeGit(),
  isFile: () => true,
  available: () => true,
  run: () => ok,
  readFile: () => Buffer.from(''),
  realpath: (p) => p,
  writeFile: () => {},
  rename: () => {},
  now: () => 0,
  env: { CLAUDE_PROJECT_DIR: '/p' },
  cwd: () => '/elsewhere',
  pid: 7,
  statePath: () => '/tmp/cdk-format-lint-test.json',
  ...over
});

test('list: splits NUL-separated stdout into names', () => {
  // Arrange
  const res = out('a.md\0b.md\0');
  // Act
  const names = list(res);
  // Assert
  assert.deepEqual(names, ['a.md', 'b.md']);
});

test('list: returns an empty array for empty stdout', () => {
  // Arrange
  const res = out('');
  // Act
  const names = list(res);
  // Assert
  assert.deepEqual(names, []);
});

test('pathspecs: builds a case-insensitive glob per extension', () => {
  // Arrange
  const exts = ['md', 'markdown'];
  // Act
  const { files } = pathspecs(exts, []);
  // Assert
  assert.deepEqual(files, [':(glob,icase)**/*.md', ':(glob,icase)**/*.markdown']);
});

test('pathspecs: matches Dockerfile and Dockerfile.* for the dockerfile group', () => {
  // Arrange
  const exts = ['dockerfile'];
  // Act
  const { files } = pathspecs(exts, []);
  // Assert
  assert.deepEqual(files, [':(glob)**/Dockerfile', ':(glob)**/Dockerfile.*']);
});

test('pathspecs: adds each step config once as a literal path', () => {
  // Arrange
  const steps = [{ configs: ['a.cfg'] }, { alt: [{ configs: ['a.cfg', 'b.cfg'] }] }];
  // Act
  const { all, files } = pathspecs(['x'], steps);
  // Assert
  assert.deepEqual(all, [...files, ':(literal)a.cfg', ':(literal)b.cfg']);
});

test('pathspecs: adds no literal paths when no step has configs', () => {
  // Arrange
  const steps = [{ cmd: 'x' }];
  // Act
  const { all, files } = pathspecs(['x'], steps);
  // Assert
  assert.deepEqual(all, files);
});

test('chunks: keeps files together when they fit one command line', () => {
  // Arrange
  const files = ['a', 'b', 'c'];
  // Act
  const result = chunks(files);
  // Assert
  assert.deepEqual(result, [['a', 'b', 'c']]);
});

test('chunks: splits when the next file would exceed the limit', () => {
  // Arrange
  const files = ['aaaa', 'bbbb', 'cccc'];
  // Act
  const result = chunks(files, 10);
  // Assert
  assert.deepEqual(result, [['aaaa'], ['bbbb'], ['cccc']]);
});

test('chunks: returns no chunks for no files', () => {
  // Arrange
  const files = [];
  // Act
  const result = chunks(files);
  // Assert
  assert.deepEqual(result, []);
});

test('chunks: puts an oversized single file in its own chunk', () => {
  // Arrange
  const files = ['x'.repeat(50)];
  // Act
  const result = chunks(files, 10);
  // Assert
  assert.deepEqual(result, [files]);
});

test('fingerprint: is empty when there is no diff and no untracked file', () => {
  // Arrange
  const deps = { git: fakeGit() };
  // Act
  const fp = fingerprint('/p', ['x'], deps);
  // Assert
  assert.equal(fp, '');
});

test('fingerprint: hashes a diff into a hex digest', () => {
  // Arrange
  const deps = { git: fakeGit({ diff: 'diff --git a b' }) };
  // Act
  const fp = fingerprint('/p', ['x'], deps);
  // Assert
  assert.match(fp, /^[0-9a-f]{64}$/);
});

test('fingerprint: differs when an untracked file content differs', () => {
  // Arrange
  const git = fakeGit({ untracked: ['n.md'] });
  const a = fingerprint('/p', ['x'], { git, readFile: () => Buffer.from('one') });
  // Act
  const b = fingerprint('/p', ['x'], { git, readFile: () => Buffer.from('two') });
  // Assert
  assert.notEqual(a, b);
});

test('fingerprint: still counts an untracked file that cannot be read', () => {
  // Arrange
  const deps = {
    git: fakeGit({ untracked: ['gone.md'] }),
    readFile: () => {
      throw new Error('ENOENT');
    }
  };
  // Act
  const fp = fingerprint('/p', ['x'], deps);
  // Assert
  assert.match(fp, /^[0-9a-f]{64}$/);
});

test('fingerprint: is null when git fails', () => {
  // Arrange
  const deps = { git: fakeGit({ status: 128 }) };
  // Act
  const fp = fingerprint('/p', ['x'], deps);
  // Assert
  assert.equal(fp, null);
});

test('fingerprint: is null when git reports an error', () => {
  // Arrange
  const deps = { git: () => ({ error: new Error('spawn'), status: null, stdout: Buffer.from('') }) };
  // Act
  const fp = fingerprint('/p', ['x'], deps);
  // Assert
  assert.equal(fp, null);
});

test('groupFiles: keeps sorted unique files with a matching extension', () => {
  // Arrange
  const deps = { git: fakeGit({ all: ['b.md', 'a.md', 'a.md', 'c.txt'] }), isFile: () => true };
  // Act
  const files = groupFiles('/p', ['md'], ['x'], deps);
  // Assert
  assert.deepEqual(files, ['a.md', 'b.md']);
});

test('groupFiles: drops files under node_modules and .git', () => {
  // Arrange
  const deps = { git: fakeGit({ all: ['node_modules/x/a.md', '.git/b.md', 'ok.md'] }), isFile: () => true };
  // Act
  const files = groupFiles('/p', ['md'], ['x'], deps);
  // Assert
  assert.deepEqual(files, ['ok.md']);
});

test('groupFiles: drops file names with cmd.exe metacharacters on Windows', () => {
  // Arrange
  const deps = { win: true, git: fakeGit({ all: ['a"b.md', '100%.md', 'ok.md'] }), isFile: () => true };
  // Act
  const files = groupFiles('/p', ['md'], ['x'], deps);
  // Assert
  assert.deepEqual(files, ['ok.md']);
});

test('groupFiles: keeps the same file names off Windows', () => {
  // Arrange
  const deps = { win: false, git: fakeGit({ all: ['100%.md', 'ok.md'] }), isFile: () => true };
  // Act
  const files = groupFiles('/p', ['md'], ['x'], deps);
  // Assert
  assert.deepEqual(files, ['100%.md', 'ok.md']);
});

test('groupFiles: drops files that no longer exist on disk', () => {
  // Arrange
  const deps = { git: fakeGit({ all: ['gone.md', 'here.md'] }), isFile: (f) => f.endsWith('here.md') };
  // Act
  const files = groupFiles('/p', ['md'], ['x'], deps);
  // Assert
  assert.deepEqual(files, ['here.md']);
});

test('groupFiles: is empty when git fails', () => {
  // Arrange
  const deps = { git: fakeGit({ status: 128 }) };
  // Act
  const files = groupFiles('/p', ['md'], ['x'], deps);
  // Assert
  assert.deepEqual(files, []);
});

test('runStep: runs one batch and succeeds', () => {
  // Arrange
  const calls = [];
  const deps = { now: () => 0, run: (...a) => (calls.push(a), ok) };
  const step = { cmd: 'yamlfmt', args: [], strict: ['--strict'] };
  const failures = [];
  // Act
  const result = runStep(step, ['a.yml', 'b.yml'], '/p', failures, 1000, deps);
  // Assert
  assert.equal(result, true);
  assert.deepEqual(calls[0].slice(0, 3), ['yamlfmt', ['--strict', 'a.yml', 'b.yml'], '/p']);
  assert.deepEqual(failures, []);
});

test('runStep: runs once per file when the args name the file', () => {
  // Arrange
  const calls = [];
  const deps = { now: () => 0, run: (...a) => (calls.push(a[1]), ok) };
  const step = { cmd: 'xmllint', args: ['--format', '{file}', '--output', '{file}'] };
  // Act
  runStep(step, ['a.xml', 'b.xml'], '/p', [], 1000, deps);
  // Assert
  assert.deepEqual(calls, [
    ['--format', 'a.xml', '--output', 'a.xml'],
    ['--format', 'b.xml', '--output', 'b.xml']
  ]);
});

test('runStep: writes stdout back to the file for stdout steps', () => {
  // Arrange
  const writes = [];
  const renames = [];
  const deps = {
    now: () => 0,
    pid: 9,
    run: () => ({ status: 0, stdout: '<a/>', stderr: '' }),
    writeFile: (f, d) => writes.push([f, d]),
    rename: (a, b) => renames.push([a, b])
  };
  const step = { cmd: 'xmlstarlet', args: ['fo'], stdout: true };
  // Act
  runStep(step, ['a.xml'], '/p', [], 1000, deps);
  // Assert
  assert.deepEqual(writes, [['/p/a.xml.9.tmp', '<a/>']]);
  assert.deepEqual(renames, [['/p/a.xml.9.tmp', '/p/a.xml']]);
});

test('runStep: records the command and its output when it fails', () => {
  // Arrange
  const deps = { now: () => 0, run: () => ({ status: 1, stdout: 'bad', stderr: 'oops' }) };
  const failures = [];
  // Act
  const result = runStep({ cmd: 'yamllint', args: [] }, ['a.yml'], '/p', failures, 1000, deps);
  // Assert
  assert.equal(result, false);
  assert.equal(failures[0], '$ yamllint a.yml\nbad\noops');
});

test('runStep: does not run once the deadline has passed', () => {
  // Arrange
  const calls = [];
  const deps = { now: () => 2000, run: (...a) => (calls.push(a), ok) };
  const failures = [];
  // Act
  const result = runStep({ cmd: 'yamllint', args: [] }, ['a.yml'], '/p', failures, 1000, deps);
  // Assert
  assert.equal(result, false);
  assert.equal(calls.length, 0);
  assert.ok(failures[0].includes(`Timed out after ${BUDGET / 1000}s total; not run on 1 files`));
});

test('runStep: wraps npx steps and caps the per-command timeout', () => {
  // Arrange
  const calls = [];
  const deps = { now: () => 0, run: (...a) => (calls.push(a), ok) };
  const step = { cmd: 'prettier', args: ['-w'], npx: true };
  // Act
  runStep(step, ['a.md'], '/p', [], 10_000_000, deps);
  // Assert
  assert.deepEqual(calls[0], ['npx', ['--no-install', 'prettier', '-w', 'a.md'], '/p', 300_000]);
});

test('formatLintRepo: reports each step for stale groups', () => {
  // Arrange
  const deps = baseDeps({
    git: fakeGit({ untracked: ['a.yml'], all: ['a.yml'] }),
    readFile: () => Buffer.from('{}'),
    available: (step) => ['yamlfmt', 'yamllint'].includes(step.cmd)
  });
  // Act
  const result = formatLintRepo({}, deps);
  // Assert
  assert.deepEqual(result, { systemMessage: '✅ Format yamlfmt: 1 .yaml files | ✅ Lint yamllint: 1 .yaml files' });
});

test('formatLintRepo: blocks with the failure output', () => {
  // Arrange
  const deps = baseDeps({
    git: fakeGit({ untracked: ['a.yml'], all: ['a.yml'] }),
    available: (step) => step.cmd === 'yamllint',
    run: () => ({ status: 1, stdout: 'line too long', stderr: '' })
  });
  // Act
  const result = formatLintRepo({}, deps);
  // Assert
  assert.equal(result.decision, 'block');
  assert.match(result.reason, /Repository format\/lint issues/);
  assert.match(result.reason, /line too long/);
});

test('formatLintRepo: records fingerprints in the state file after a run', () => {
  // Arrange
  const writes = [];
  const deps = baseDeps({
    git: fakeGit({ untracked: ['a.yml'], all: ['a.yml'] }),
    available: (step) => step.cmd === 'yamllint',
    writeFile: (f, d) => writes.push([f, JSON.parse(d)])
  });
  // Act
  formatLintRepo({}, deps);
  // Assert
  assert.equal(writes.length, 1);
  assert.match(writes[0][1].yaml, /^[0-9a-f]{64}$/);
});

test('formatLintRepo: does nothing on a clean first run', () => {
  // Arrange
  const deps = baseDeps({
    readFile: () => {
      throw new Error('ENOENT');
    }
  });
  // Act
  const result = formatLintRepo({}, deps);
  // Assert
  assert.equal(result, null);
});

test('formatLintRepo: does nothing when git fails', () => {
  // Arrange
  const deps = baseDeps({ git: fakeGit({ status: 128 }) });
  // Act
  const result = formatLintRepo({}, deps);
  // Assert
  assert.equal(result, null);
});

test('formatLintRepo: does nothing when the project directory cannot be resolved', () => {
  // Arrange
  const deps = baseDeps({
    realpath: () => {
      throw new Error('ENOENT');
    }
  });
  // Act
  const result = formatLintRepo({}, deps);
  // Assert
  assert.equal(result, null);
});

test('formatLintRepo: skips groups whose fingerprint matches the saved state', () => {
  // Arrange
  const git = fakeGit({ untracked: ['a.yml'], all: ['a.yml'] });
  const saved = fingerprint('/p', ['x'], { git, readFile: () => Buffer.from('') });
  // The fake git answers every group alike, so one saved fingerprint covers all groups.
  const state = Object.fromEntries(
    ['cs', 'md', 'dockerfile', 'js', 'css', 'php', 'xml', 'yaml'].map((k) => [k, saved])
  );
  const readFile = (f) => Buffer.from(f.includes('cdk-format-lint') ? JSON.stringify(state) : '');
  const deps = baseDeps({ git, readFile });
  // Act
  const result = formatLintRepo({}, deps);
  // Assert
  assert.equal(result, null);
});
