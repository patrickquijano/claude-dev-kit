import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import {
  MAX,
  stopOutput,
  contextOutput,
  expected,
  projectDir,
  readJsonStdin,
  readStdin,
  runIfMain
} from '../../../../../hooks/scripts/lib/hook-io.mjs';

const id = (p) => p;

test('runIfMain: runs fn when the module is the entry script', async () => {
  // Arrange
  const calls = [];
  const argv = ['node', '/tmp/entry.mjs'];
  // Act
  await runIfMain(pathToFileURL('/tmp/entry.mjs').href, () => void calls.push(1), {}, argv);
  // Assert
  assert.equal(calls.length, 1);
});

test('runIfMain: awaits an async fn', async () => {
  // Arrange
  const calls = [];
  const argv = ['node', '/tmp/entry.mjs'];
  // Act
  await runIfMain(
    pathToFileURL('/tmp/entry.mjs').href,
    async () => void calls.push(await Promise.resolve(1)),
    {},
    argv
  );
  // Assert
  assert.deepEqual(calls, [1]);
});

test('runIfMain: skips fn when another script is the entry', async () => {
  // Arrange
  const calls = [];
  const argv = ['node', '/tmp/other.mjs'];
  // Act
  await runIfMain(pathToFileURL('/tmp/entry.mjs').href, () => void calls.push(1), {}, argv);
  // Assert
  assert.equal(calls.length, 0);
});

test('runIfMain: skips fn when there is no entry script', async () => {
  // Arrange
  const calls = [];
  // Act
  await runIfMain(pathToFileURL('/tmp/entry.mjs').href, () => void calls.push(1), {}, ['node']);
  // Assert
  assert.equal(calls.length, 0);
});

const ENTRY = pathToFileURL('/tmp/entry.mjs').href;
const ARGV = ['node', '/tmp/entry.mjs'];
const capture = () => {
  const seen = { err: [], out: [], exit: [] };
  return {
    seen,
    io: { stderr: (t) => seen.err.push(t), stdout: (t) => seen.out.push(t), setExit: (c) => seen.exit.push(c) }
  };
};

test('runIfMain: prints one labeled stderr line and exits 1 when fn throws', async () => {
  // Arrange
  const { seen, io } = capture();
  // Act
  await runIfMain(
    ENTRY,
    () => {
      throw new Error('boom\n    at stack line');
    },
    { label: 'stop' },
    ARGV,
    io
  );
  // Assert
  assert.deepEqual(seen.err, ['cdk stop: boom\n']);
  assert.deepEqual(seen.exit, [1]);
});

test('runIfMain: uses failCode 2 for a gate', async () => {
  // Arrange
  const { seen, io } = capture();
  // Act
  await runIfMain(
    ENTRY,
    async () => {
      throw new Error('bad');
    },
    { label: 'gate', failCode: 2 },
    ARGV,
    io
  );
  // Assert
  assert.deepEqual(seen.exit, [2]);
});

test('runIfMain: failCode 0 prints a systemMessage to stdout, nothing to stderr, and sets no exit code', async () => {
  // Arrange
  const { seen, io } = capture();
  // Act
  await runIfMain(
    ENTRY,
    () => {
      throw new Error('boom\n    at stack line');
    },
    { label: 'stop', failCode: 0 },
    ARGV,
    io
  );
  // Assert
  assert.deepEqual(seen.out, ['{"systemMessage":"cdk stop: boom"}\n']);
  assert.deepEqual(seen.err, []);
  assert.deepEqual(seen.exit, []);
});

test('runIfMain: failCode 0 prints nothing when fn succeeds', async () => {
  // Arrange
  const { seen, io } = capture();
  // Act
  await runIfMain(ENTRY, () => undefined, { label: 'stop', failCode: 0 }, ARGV, io);
  // Assert
  assert.deepEqual(seen.out, []);
});

test('runIfMain: caps a long error message', async () => {
  // Arrange
  const { seen, io } = capture();
  // Act
  await runIfMain(
    ENTRY,
    () => {
      throw new Error('x'.repeat(1000));
    },
    { label: 'a' },
    ARGV,
    io
  );
  // Assert
  assert.equal(seen.err[0].length, 'cdk a: '.length + 300 + 1);
});

test('runIfMain: a number fn returns becomes the exit code', async () => {
  // Arrange
  const { seen, io } = capture();
  // Act
  await runIfMain(ENTRY, async () => 2, { label: 'a' }, ARGV, io);
  // Assert
  assert.deepEqual(seen.exit, [2]);
  assert.deepEqual(seen.err, []);
});

test('runIfMain: sets no exit code when fn returns nothing', async () => {
  // Arrange
  const { seen, io } = capture();
  // Act
  await runIfMain(ENTRY, () => undefined, { label: 'a' }, ARGV, io);
  // Assert
  assert.deepEqual(seen.exit, []);
});

test('runIfMain: reports nothing when another script is the entry', async () => {
  // Arrange
  const { seen, io } = capture();
  // Act
  await runIfMain(
    ENTRY,
    () => {
      throw new Error('boom');
    },
    { label: 'a' },
    ['node', '/tmp/other.mjs'],
    io
  );
  // Assert
  assert.deepEqual(seen, { err: [], out: [], exit: [] });
});

test('expected: true when the error code is listed', () => {
  // Arrange
  const err = Object.assign(new Error('x'), { code: 'ENOENT' });
  // Act
  const result = expected(err, 'ENOENT', 'ENOTDIR');
  // Assert
  assert.equal(result, true);
});

test('expected: true for the second listed code', () => {
  // Arrange
  const err = { code: 'ENOTDIR' };
  // Act
  const result = expected(err, 'ENOENT', 'ENOTDIR');
  // Assert
  assert.equal(result, true);
});

test('expected: false for another code', () => {
  // Arrange
  const err = Object.assign(new Error('x'), { code: 'EACCES' });
  // Act
  const result = expected(err, 'ENOENT');
  // Assert
  assert.equal(result, false);
});

test('expected: false for an error with no code or a non-object', () => {
  // Arrange
  const errors = [new Error('x'), null, undefined];
  // Act
  const results = errors.map((e) => expected(e, 'ENOENT'));
  // Assert
  assert.deepEqual(results, [false, false, false]);
});

test('readStdin: concatenates all chunks', async () => {
  // Arrange
  const stream = Readable.from(['{"a":', '1}']);
  // Act
  const data = await readStdin(stream);
  // Assert
  assert.equal(data, '{"a":1}');
});

test('readStdin: returns an empty string for an empty stream', async () => {
  // Arrange
  const stream = Readable.from([]);
  // Act
  const data = await readStdin(stream);
  // Assert
  assert.equal(data, '');
});

test('readJsonStdin: parses an object', async () => {
  // Arrange
  const stream = Readable.from(['{"prompt":"hi"}']);
  // Act
  const data = await readJsonStdin(stream);
  // Assert
  assert.deepEqual(data, { prompt: 'hi' });
});

test('readJsonStdin: parses an empty object', async () => {
  // Arrange
  const stream = Readable.from(['{}']);
  // Act
  const data = await readJsonStdin(stream);
  // Assert
  assert.deepEqual(data, {});
});

test('readJsonStdin: throws for invalid JSON', async () => {
  // Arrange
  const stream = Readable.from(['not json']);
  // Act
  const act = readJsonStdin(stream);
  // Assert
  await assert.rejects(act);
});

test('readJsonStdin: throws for empty input', async () => {
  // Arrange
  const stream = Readable.from([]);
  // Act
  const act = readJsonStdin(stream);
  // Assert
  await assert.rejects(act);
});

test('readJsonStdin: throws for a non-object value', async () => {
  // Arrange
  const stream = Readable.from(['[1,2]']);
  // Act
  const act = readJsonStdin(stream);
  // Assert
  await assert.rejects(act);
});

test('projectDir: prefers CLAUDE_PROJECT_DIR over the event cwd', () => {
  // Arrange
  const deps = { env: { CLAUDE_PROJECT_DIR: '/env' }, cwd: () => '/proc', realpath: id };
  // Act
  const dir = projectDir({ cwd: '/event' }, deps);
  // Assert
  assert.equal(dir, '/env');
});

test('projectDir: falls back to the event cwd, then the process cwd', () => {
  // Arrange
  const deps = { env: {}, cwd: () => '/proc', realpath: id };
  // Act
  const fromEvent = projectDir({ cwd: '/event' }, deps);
  const fromProcess = projectDir({}, deps);
  // Assert
  assert.equal(fromEvent, '/event');
  assert.equal(fromProcess, '/proc');
});

test("projectDir: prefer 'cwd' puts the event cwd first", () => {
  // Arrange
  const deps = { env: { CLAUDE_PROJECT_DIR: '/env' }, cwd: () => '/proc', realpath: id };
  // Act
  const dir = projectDir({ cwd: '/event' }, deps, { prefer: 'cwd' });
  // Assert
  assert.equal(dir, '/event');
});

test('projectDir: resolves the real path', () => {
  // Arrange
  const deps = { env: { CLAUDE_PROJECT_DIR: '/link' }, cwd: () => '/proc', realpath: (p) => `${p}-real` };
  // Act
  const dir = projectDir({}, deps);
  // Assert
  assert.equal(dir, '/link-real');
});

test('projectDir: throws when the directory does not exist', () => {
  // Arrange
  const deps = {
    env: {},
    cwd: () => '/proc',
    realpath: () => {
      throw new Error('ENOENT');
    }
  };
  // Act
  const act = () => projectDir({}, deps);
  // Assert
  assert.throws(act, /ENOENT/);
});

test('projectDir: ignores a non-string event cwd', () => {
  // Arrange
  const deps = { env: {}, cwd: () => '/proc', realpath: id };
  // Act
  const dir = projectDir({ cwd: 5 }, deps);
  // Assert
  assert.equal(dir, '/proc');
});

test('contextOutput: wraps the text in hookSpecificOutput for the event', () => {
  // Arrange
  const text = 'do this';
  // Act
  const out = contextOutput('Stop', text);
  // Assert
  assert.deepEqual(out, { hookSpecificOutput: { hookEventName: 'Stop', additionalContext: 'do this' } });
});

test('contextOutput: carries extra top-level fields', () => {
  // Arrange
  const extra = { systemMessage: 'note' };
  // Act
  const out = contextOutput('SessionStart', 'x', extra);
  // Assert
  assert.equal(out.systemMessage, 'note');
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
});

test('contextOutput: has no top-level fields beyond hookSpecificOutput by default', () => {
  // Arrange
  const text = 'x';
  // Act
  const out = contextOutput('PostToolUse', text);
  // Assert
  assert.deepEqual(Object.keys(out), ['hookSpecificOutput']);
});

test('stopOutput: continues Claude with the reason as Stop additionalContext', () => {
  // Arrange
  const reason = 'do the steps';
  // Act
  const out = stopOutput('msg', reason);
  // Assert
  assert.deepEqual(out, {
    systemMessage: 'msg',
    hookSpecificOutput: { hookEventName: 'Stop', additionalContext: reason }
  });
});

test('stopOutput: has no decision key', () => {
  // Arrange
  const reason = 'x';
  // Act
  const out = stopOutput('msg', reason);
  // Assert
  assert.equal('decision' in out, false);
});

test('stopOutput: caps the context at MAX characters', () => {
  // Arrange
  const reason = 'x'.repeat(MAX + 100);
  // Act
  const out = stopOutput('msg', reason);
  // Assert
  assert.equal(out.hookSpecificOutput.additionalContext.length, MAX);
});

test('stopOutput: keeps a reason shorter than MAX whole', () => {
  // Arrange
  const reason = 'x'.repeat(MAX - 1);
  // Act
  const out = stopOutput('msg', reason);
  // Assert
  assert.equal(out.hookSpecificOutput.additionalContext, reason);
});
