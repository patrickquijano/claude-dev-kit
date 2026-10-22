import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { main } from '../../../../hooks/scripts/stop.mjs';

const run = async (input, result) => {
  const writes = [];
  const seen = [];
  await main({
    stream: Readable.from([input]),
    write: (t) => writes.push(t),
    formatLintRepo: (i) => (seen.push(i), result)
  });
  return { writes, seen };
};

test('main: prints the formatLintRepo result as JSON', async () => {
  // Arrange
  const result = { systemMessage: 'm', hookSpecificOutput: { hookEventName: 'Stop', additionalContext: 'fix' } };
  // Act
  const { writes } = await run('{}', result);
  // Assert
  assert.deepEqual(writes, [JSON.stringify(result)]);
});

test('main: passes the parsed event to formatLintRepo', async () => {
  // Arrange
  const input = '{"cwd":"/p"}';
  // Act
  const { seen } = await run(input, null);
  // Assert
  assert.deepEqual(seen, [{ cwd: '/p' }]);
});

test('main: prints nothing when no group changed', async () => {
  // Arrange
  const input = '{}';
  // Act
  const { writes } = await run(input, null);
  // Assert
  assert.deepEqual(writes, []);
});

test('main: rejects and skips formatLintRepo for invalid JSON', async () => {
  // Arrange
  const input = 'not json';
  // Act
  const act = run(input, { systemMessage: 'x' });
  // Assert
  await assert.rejects(act, SyntaxError);
});

test('main: rejects for empty stdin', async () => {
  // Arrange
  const input = '';
  // Act
  const act = run(input, null);
  // Assert
  await assert.rejects(act, SyntaxError);
});
