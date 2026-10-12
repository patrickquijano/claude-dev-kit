import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { main } from '../../../../hooks/scripts/post-tool-use.mjs';

const run = async (input, result) => {
  const writes = [];
  const seen = [];
  await main({
    stream: Readable.from([input]),
    write: (t) => writes.push(t),
    formatLint: (i) => (seen.push(i), result)
  });
  return { writes, seen };
};

test('main: prints the formatLint result as JSON', async () => {
  // Arrange
  const result = { systemMessage: '✅' };
  // Act
  const { writes } = await run('{"tool_input":{}}', result);
  // Assert
  assert.deepEqual(writes, ['{"systemMessage":"✅"}']);
});

test('main: passes the parsed event to formatLint', async () => {
  // Arrange
  const input = '{"tool_input":{"file_path":"a.md"}}';
  // Act
  const { seen } = await run(input, null);
  // Assert
  assert.deepEqual(seen, [{ tool_input: { file_path: 'a.md' } }]);
});

test('main: prints nothing when formatLint has nothing to report', async () => {
  // Arrange
  const input = '{}';
  // Act
  const { writes } = await run(input, null);
  // Assert
  assert.deepEqual(writes, []);
});

test('main: rejects and skips formatLint for invalid JSON', async () => {
  // Arrange
  const input = 'not json';
  // Act
  const act = run(input, { systemMessage: 'x' });
  // Assert
  await assert.rejects(act, SyntaxError);
});

test('main: rejects for a JSON array', async () => {
  // Arrange
  const input = '[1]';
  // Act
  const act = run(input, null);
  // Assert
  await assert.rejects(act, TypeError);
});
