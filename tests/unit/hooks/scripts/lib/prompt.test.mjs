import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOPLAN_RE, PLAN_RE, isSkippedPrompt } from '../../../../../hooks/scripts/lib/prompt.mjs';

test('isSkippedPrompt: is true for a slash command', () => {
  // Arrange
  const prompt = '/cdk:commit-changes';
  // Act
  const result = isSkippedPrompt(prompt);
  // Assert
  assert.equal(result, true);
});

test('isSkippedPrompt: is true for a ! prompt after leading whitespace', () => {
  // Arrange
  const prompt = '  !ls';
  // Act
  const result = isSkippedPrompt(prompt);
  // Assert
  assert.equal(result, true);
});

test('isSkippedPrompt: is false for a plain prompt', () => {
  // Arrange
  const prompt = 'Fix the bug';
  // Act
  const result = isSkippedPrompt(prompt);
  // Assert
  assert.equal(result, false);
});

test('isSkippedPrompt: is false when the prefix appears mid-prompt', () => {
  // Arrange
  const prompt = 'run /help later!';
  // Act
  const result = isSkippedPrompt(prompt);
  // Assert
  assert.equal(result, false);
});

test('PLAN_RE: matches #plan at the start and after a space', () => {
  // Arrange
  const prompts = ['#plan fix it', 'fix it #plan'];
  // Act
  const results = prompts.map((p) => PLAN_RE.test(p));
  // Assert
  assert.deepEqual(results, [true, true]);
});

test('PLAN_RE: does not match #noplan or an embedded word', () => {
  // Arrange
  const prompts = ['fix #noplan', 'a#plan', '#planet'];
  // Act
  const results = prompts.map((p) => PLAN_RE.test(p));
  // Assert
  assert.deepEqual(results, [false, false, false]);
});

test('NOPLAN_RE: matches #noplan at the start and after a space', () => {
  // Arrange
  const prompts = ['#noplan go', 'go #noplan'];
  // Act
  const results = prompts.map((p) => NOPLAN_RE.test(p));
  // Assert
  assert.deepEqual(results, [true, true]);
});

test('NOPLAN_RE: does not match #plan or an embedded word', () => {
  // Arrange
  const prompts = ['go #plan', 'x#noplan', '#noplans'];
  // Act
  const results = prompts.map((p) => NOPLAN_RE.test(p));
  // Assert
  assert.deepEqual(results, [false, false, false]);
});
