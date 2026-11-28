import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { main } from '../../../../hooks/scripts/subagent-stop.mjs';

const GOOD = 'Status: done\nProof:\n- tests: exit 0\n- lint: exit 0\n';
const BAD = 'Status: done\nProof:\n- tests: exit 1\n- lint: exit 0\n';

const run = async (event) => {
  const writes = [];
  await main({
    stream: Readable.from([typeof event === 'string' ? event : JSON.stringify(event)]),
    write: (t) => writes.push(t)
  });
  return writes;
};

test('main: blocks with a reason when a proof exit code is nonzero', async () => {
  // Arrange
  const event = { last_assistant_message: BAD };
  // Act
  const writes = await run(event);
  // Assert
  const out = JSON.parse(writes[0]);
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /tests exited 1/);
});

test('main: blocks when the report has no Proof section', async () => {
  // Arrange
  const event = { last_assistant_message: 'Status: done\nChanged: a.mjs\n' };
  // Act
  const writes = await run(event);
  // Assert
  assert.equal(JSON.parse(writes[0]).decision, 'block');
});

test('main: prints nothing for a passing report', async () => {
  // Arrange
  const event = { last_assistant_message: GOOD };
  // Act
  const writes = await run(event);
  // Assert
  assert.deepEqual(writes, []);
});

test('main: prints nothing when stop_hook_active is true, even for a failing report', async () => {
  // Arrange
  const event = { stop_hook_active: true, last_assistant_message: BAD };
  // Act
  const writes = await run(event);
  // Assert
  assert.deepEqual(writes, []);
});

test('main: prints nothing when there is no last_assistant_message', async () => {
  // Arrange
  const event = {};
  // Act
  const writes = await run(event);
  // Assert
  assert.deepEqual(writes, []);
});

test('main: rejects for invalid JSON', async () => {
  // Arrange
  const input = 'not json';
  // Act
  const act = run(input);
  // Assert
  await assert.rejects(act, SyntaxError);
});
