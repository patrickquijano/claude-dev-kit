import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { main } from '../../../../hooks/scripts/user-prompt-submit.mjs';

const run = async (event, extra = {}) => {
  const written = [];
  const marked = [];
  await main({
    stream: Readable.from([JSON.stringify(event)]),
    write: (t) => written.push(t),
    markTurnStart: (e) => marked.push(e),
    ...extra
  });
  return { written, marked };
};

test('main prints only plan-mode context for a task prompt', async () => {
  // Arrange
  const event = { prompt: 'Fix X', permission_mode: 'default', session_id: 's' };
  // Act
  const { written } = await run(event);
  // Assert
  const ctx = JSON.parse(written[0]).hookSpecificOutput.additionalContext;
  assert.match(ctx, /whether to enter plan mode/);
  assert.doesNotMatch(ctx, /end-of-task|cdk:commit-changes|update-changelog/);
});

test('main prints nothing for a machine prompt', async () => {
  // Arrange
  const event = { prompt: '<task-notification>x', permission_mode: 'default', session_id: 's' };
  // Act
  const { written } = await run(event);
  // Assert
  assert.deepEqual(written, []);
});

test('main records the turn start for a task prompt', async () => {
  // Arrange
  const event = { prompt: 'Fix X', permission_mode: 'default', session_id: 's' };
  // Act
  const { marked } = await run(event);
  // Assert
  assert.deepEqual(marked, [event]);
});

test('main records the turn start for a machine prompt', async () => {
  // Arrange
  const event = { prompt: '<task-notification>x', permission_mode: 'default', session_id: 's' };
  // Act
  const { marked } = await run(event);
  // Assert
  assert.deepEqual(marked, [event]);
});

test('main rejects and prints nothing for invalid JSON', async () => {
  // Arrange
  const written = [];
  // Act
  const act = main({ stream: Readable.from(['nope']), write: (t) => written.push(t), markTurnStart: () => {} });
  // Assert
  await assert.rejects(act, SyntaxError);
  assert.deepEqual(written, []);
});
