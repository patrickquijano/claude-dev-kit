import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  classify,
  decide,
  delayFor,
  firstLine,
  recordAttempt,
  run
} from '../../../../../../.claude/skills/release-plugin/scripts/failure-handlers.mjs';

describe('classify', () => {
  test('network output wins over the command', () => {
    // Arrange
    const failure = { command: 'npm test', output: 'Error: ECONNRESET' };
    // Act
    const cls = classify(failure);
    // Assert
    assert.equal(cls, 'network');
  });

  test('a lint command is lint', () => {
    // Arrange
    const failure = { command: 'npm run lint', output: 'x' };
    // Act
    const cls = classify(failure);
    // Assert
    assert.equal(cls, 'lint');
  });

  test('a test command is test', () => {
    // Arrange
    const failure = { command: 'npm test', output: 'not ok 1 - a' };
    // Act
    const cls = classify(failure);
    // Assert
    assert.equal(cls, 'test');
  });

  test('CodeQL output is codeql', () => {
    // Arrange
    const failure = { command: 'gh pr checks 3', output: 'CodeQL  fail' };
    // Act
    const cls = classify(failure);
    // Assert
    assert.equal(cls, 'codeql');
  });

  test('unmatched failure is unknown', () => {
    // Arrange
    const failure = { command: 'git push', output: 'rejected' };
    // Act
    const cls = classify(failure);
    // Assert
    assert.equal(cls, 'unknown');
  });

  test('no argument is unknown', () => {
    // Arrange
    const failure = undefined;
    // Act
    const cls = classify(failure);
    // Assert
    assert.equal(cls, 'unknown');
  });
});

describe('decide', () => {
  test('a first test failure retries with the test handler', () => {
    // Arrange
    const failure = { command: 'npm test', output: 'not ok 1' };
    // Act
    const d = decide(failure, 0);
    // Assert
    assert.equal(d.action, 'retry');
    assert.equal(d.handler.rerun, 'npm test');
  });

  test('a lint failure names the format and eslint fix commands', () => {
    // Arrange
    const failure = { command: 'npm run lint', output: 'prettier' };
    // Act
    const d = decide(failure, 1);
    // Assert
    assert.deepEqual(d.handler.commands, ['npm run format', 'npx eslint . --fix']);
  });

  test('a network failure backs off exponentially', () => {
    // Arrange
    const failure = { command: 'gh pr view', output: 'ETIMEDOUT' };
    // Act
    const delays = [decide(failure, 0).delayMs, decide(failure, 1).delayMs];
    // Assert
    assert.deepEqual(delays, [2000, 4000]);
  });

  test('a codeql failure uses a read-only gh api command', () => {
    // Arrange
    const failure = { command: 'gh pr checks', output: 'CodeQL failed' };
    // Act
    const d = decide(failure, 0);
    // Assert
    assert.match(d.handler.commands[0], /^gh api repos\/\{owner\}\/\{repo\}\/code-scanning\/alerts/);
  });

  test('escalates once the cap of 2 attempts is reached', () => {
    // Arrange
    const failure = { command: 'npm test', output: 'not ok 1 - boom\nmore' };
    // Act
    const d = decide(failure, 2);
    // Assert
    assert.equal(d.action, 'escalate');
    assert.equal(d.diagnosis, 'test failure after 2 handler attempt(s): not ok 1 - boom');
  });

  test('escalates an unknown class at once', () => {
    // Arrange
    const failure = { command: 'git push', output: 'rejected' };
    // Act
    const d = decide(failure, 0);
    // Assert
    assert.equal(d.action, 'escalate');
  });

  test('rejects a negative or fractional attempt count', () => {
    // Arrange
    const failure = { command: 'npm test', output: '' };
    // Act
    const act = () => decide(failure, -1);
    // Assert
    assert.throws(act, RangeError);
    assert.throws(() => decide(failure, 1.5), RangeError);
  });
});

describe('delayFor and firstLine and recordAttempt', () => {
  test('delayFor is 0 outside the network class', () => {
    // Arrange
    const cls = 'lint';
    // Act
    const delay = delayFor(cls, 3);
    // Assert
    assert.equal(delay, 0);
  });

  test('firstLine skips blank lines and caps length', () => {
    // Arrange
    const output = `\n  \n${'x'.repeat(300)}`;
    // Act
    const line = firstLine(output);
    // Assert
    assert.equal(line.length, 200);
  });

  test('firstLine reports empty output', () => {
    // Arrange
    const output = '  \n';
    // Act
    const line = firstLine(output);
    // Assert
    assert.equal(line, 'no output');
  });

  test('recordAttempt increments one class without mutating', () => {
    // Arrange
    const failures = { test: 1 };
    // Act
    const next = recordAttempt(failures, 'test');
    // Assert
    assert.deepEqual(next, { test: 2 });
    assert.deepEqual(failures, { test: 1 });
  });

  test('recordAttempt starts a new class at 1', () => {
    // Arrange
    const failures = {};
    // Act
    const next = recordAttempt(failures, 'lint');
    // Assert
    assert.deepEqual(next, { lint: 1 });
  });
});

describe('run', () => {
  test('prints the decision JSON for stdin output and exits 0', async () => {
    // Arrange
    const out = [];
    const deps = { readStdin: async () => 'not ok 1', stdout: (t) => out.push(t) };
    // Act
    const code = await run(['0', 'npm', 'test'], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(out[0]).class, 'test');
  });

  test('returns 2 without attempts or a command', async () => {
    // Arrange
    const deps = { readStdin: async () => '', stdout: () => {} };
    // Act
    const codes = [await run([], deps), await run(['0'], deps)];
    // Assert
    assert.deepEqual(codes, [2, 2]);
  });
});
