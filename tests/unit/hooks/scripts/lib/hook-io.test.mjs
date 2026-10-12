import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import {
  MAX,
  blockOutput,
  contextOutput,
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
  await runIfMain(pathToFileURL('/tmp/entry.mjs').href, () => calls.push(1), argv);
  // Assert
  assert.equal(calls.length, 1);
});

test('runIfMain: awaits an async fn', async () => {
  // Arrange
  const calls = [];
  const argv = ['node', '/tmp/entry.mjs'];
  // Act
  await runIfMain(pathToFileURL('/tmp/entry.mjs').href, async () => calls.push(await Promise.resolve(1)), argv);
  // Assert
  assert.deepEqual(calls, [1]);
});

test('runIfMain: skips fn when another script is the entry', async () => {
  // Arrange
  const calls = [];
  const argv = ['node', '/tmp/other.mjs'];
  // Act
  await runIfMain(pathToFileURL('/tmp/entry.mjs').href, () => calls.push(1), argv);
  // Assert
  assert.equal(calls.length, 0);
});

test('runIfMain: skips fn when there is no entry script', async () => {
  // Arrange
  const calls = [];
  // Act
  await runIfMain(pathToFileURL('/tmp/entry.mjs').href, () => calls.push(1), ['node']);
  // Assert
  assert.equal(calls.length, 0);
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

test('readJsonStdin: is null for invalid JSON', async () => {
  // Arrange
  const stream = Readable.from(['not json']);
  // Act
  const data = await readJsonStdin(stream);
  // Assert
  assert.equal(data, null);
});

test('readJsonStdin: is null for empty input', async () => {
  // Arrange
  const stream = Readable.from([]);
  // Act
  const data = await readJsonStdin(stream);
  // Assert
  assert.equal(data, null);
});

test('readJsonStdin: is null for a non-object value', async () => {
  // Arrange
  const stream = Readable.from(['[1,2]']);
  // Act
  const data = await readJsonStdin(stream);
  // Assert
  assert.equal(data, null);
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

test('blockOutput: blocks with the message and the reason', () => {
  // Arrange
  const reason = 'fix it';
  // Act
  const out = blockOutput('msg', reason);
  // Assert
  assert.deepEqual(out, { systemMessage: 'msg', decision: 'block', reason: 'fix it' });
});

test('blockOutput: caps the reason at MAX characters', () => {
  // Arrange
  const reason = 'x'.repeat(MAX + 100);
  // Act
  const out = blockOutput('msg', reason);
  // Assert
  assert.equal(out.reason.length, MAX);
});

test('blockOutput: keeps a reason shorter than MAX whole', () => {
  // Arrange
  const reason = 'x'.repeat(MAX - 1);
  // Act
  const out = blockOutput('msg', reason);
  // Assert
  assert.equal(out.reason, reason);
});
