import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { main, parseInput, requireField, runSteps } from '../../../../../skills/build-hook/assets/hook-template.mjs';

const step = (name) => ({ name, cmd: 'tool', args: [name], timeout: 1000 });
const stubSpawn = (statuses) => {
  const calls = [];
  const spawn = (cmd, args, opts) => {
    calls.push({ cmd, args, opts });
    return { status: statuses[calls.length - 1] ?? 0, stdout: '', stderr: 'boom' };
  };
  return { spawn, calls };
};
const makeDeps = (text, extra = {}) => {
  const out = [];
  const err = [];
  return {
    out,
    err,
    deps: { readStdin: async () => text, stdout: (t) => out.push(t), stderr: (t) => err.push(t), ...extra }
  };
};

describe('parseInput', () => {
  test('returns the parsed object', () => {
    // Arrange
    const text = '{"a":1}';
    // Act
    const result = parseInput(text);
    // Assert
    assert.deepEqual(result, { a: 1 });
  });

  test('accepts an empty object', () => {
    // Arrange
    const text = '{}';
    // Act
    const result = parseInput(text);
    // Assert
    assert.deepEqual(result, {});
  });

  test('throws on invalid JSON', () => {
    // Arrange
    const text = 'garbage';
    // Act / Assert
    assert.throws(() => parseInput(text), SyntaxError);
  });

  test('throws on an array or null', () => {
    // Arrange
    const texts = ['[]', 'null'];
    // Act / Assert
    for (const text of texts) assert.throws(() => parseInput(text), /not a JSON object/);
  });
});

describe('requireField', () => {
  test('returns a top-level field of the right type', () => {
    // Arrange
    const input = { hook_event_name: 'Stop' };
    // Act
    const value = requireField(input, 'hook_event_name', 'string');
    // Assert
    assert.equal(value, 'Stop');
  });

  test('returns a nested field by dotted path', () => {
    // Arrange
    const input = { tool_input: { command: 'ls' } };
    // Act
    const value = requireField(input, 'tool_input.command', 'string');
    // Assert
    assert.equal(value, 'ls');
  });

  test('throws naming the path when the field is missing', () => {
    // Arrange
    const input = {};
    // Act / Assert
    assert.throws(() => requireField(input, 'tool_input.command', 'string'), /tool_input\.command/);
  });

  test('throws on a wrong type, and on null for object', () => {
    // Arrange
    const input = { n: 1, o: null };
    // Act / Assert
    assert.throws(() => requireField(input, 'n', 'string'), TypeError);
    assert.throws(() => requireField(input, 'o', 'object'), TypeError);
  });
});

describe('runSteps', () => {
  test('runs every step in order and reports ok', () => {
    // Arrange
    const { spawn, calls } = stubSpawn([0, 0]);
    // Act
    const result = runSteps([step('a'), step('b')], { spawn });
    // Assert
    assert.equal(result.ok, true);
    assert.deepEqual(
      calls.map((c) => c.args[0]),
      ['a', 'b']
    );
  });

  test('spawns without a shell and with the step timeout', () => {
    // Arrange
    const { spawn, calls } = stubSpawn([0]);
    // Act
    runSteps([step('a')], { spawn });
    // Assert
    assert.equal(calls[0].opts.shell, false);
    assert.equal(calls[0].opts.timeout, 1000);
  });

  test('stops at the first failure and names it', () => {
    // Arrange
    const { spawn, calls } = stubSpawn([0, 1, 0]);
    // Act
    const result = runSteps([step('a'), step('b'), step('c')], { spawn });
    // Assert
    assert.equal(result.ok, false);
    assert.equal(result.failed, 'b');
    assert.equal(calls.length, 2);
  });

  test('treats a spawn error as a failure', () => {
    // Arrange
    const spawn = () => ({ status: null, error: new Error('ETIMEDOUT') });
    // Act
    const result = runSteps([step('a')], { spawn });
    // Assert
    assert.equal(result.ok, false);
    assert.match(result.results[0].detail, /ETIMEDOUT/);
  });
});

describe('main', () => {
  test('prints one JSON line and returns 0 when all steps pass', async () => {
    // Arrange
    const { out, deps } = makeDeps('{"hook_event_name":"Stop"}', { spawn: stubSpawn([0]).spawn, steps: [step('a')] });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(out[0]), { systemMessage: 'Stop: 1 steps ok' });
  });

  test('warns with exit 0 when a step fails and block is off', async () => {
    // Arrange
    const { out, deps } = makeDeps('{"hook_event_name":"Stop"}', {
      spawn: stubSpawn([1]).spawn,
      steps: [step('a')],
      block: false
    });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.match(JSON.parse(out[0]).systemMessage, /step a failed/);
  });

  test('returns 2 with a stderr reason when a step fails and block is on', async () => {
    // Arrange
    const { out, err, deps } = makeDeps('{"hook_event_name":"PreToolUse"}', {
      spawn: stubSpawn([1]).spawn,
      steps: [step('a')],
      block: true
    });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 2);
    assert.match(err[0], /step a failed: boom/);
    assert.equal(out.length, 0);
  });

  test('rejects on invalid or incomplete input', async () => {
    // Arrange
    const bad = makeDeps('garbage').deps;
    const missing = makeDeps('{}').deps;
    // Act / Assert
    await assert.rejects(main(bad), SyntaxError);
    await assert.rejects(main(missing), /hook_event_name/);
  });
});
