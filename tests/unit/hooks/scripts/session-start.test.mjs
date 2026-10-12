import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { main } from '../../../../hooks/scripts/session-start.mjs';

const run = async (input) => {
  const writes = [];
  const seen = [];
  await main({
    stream: Readable.from([input]),
    write: (t) => writes.push(t),
    sessionStart: (i) => (seen.push(i), { ok: true })
  });
  return { writes, seen };
};

test('main: prints the sessionStart result as JSON', async () => {
  // Arrange
  const input = '{"source":"startup"}';
  // Act
  const { writes } = await run(input);
  // Assert
  assert.deepEqual(writes, ['{"ok":true}']);
});

test('main: passes the parsed event to sessionStart', async () => {
  // Arrange
  const input = '{"source":"resume"}';
  // Act
  const { seen } = await run(input);
  // Assert
  assert.deepEqual(seen, [{ source: 'resume' }]);
});

test('main: rejects for invalid JSON', async () => {
  // Arrange
  const input = 'not json';
  // Act
  const act = run(input);
  // Assert
  await assert.rejects(act, SyntaxError);
});

test('main: rejects for empty stdin', async () => {
  // Arrange
  const input = '';
  // Act
  const act = run(input);
  // Assert
  await assert.rejects(act, SyntaxError);
});

test('main: prints exactly one object per run', async () => {
  // Arrange
  const input = '{}';
  // Act
  const { writes } = await run(input);
  // Assert
  assert.equal(writes.length, 1);
});
