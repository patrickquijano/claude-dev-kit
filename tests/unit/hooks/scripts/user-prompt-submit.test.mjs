import assert from 'node:assert/strict';
import { test } from 'node:test';
import { merge } from '../../../../hooks/scripts/user-prompt-submit.mjs';

const wrap = (additionalContext, extra = {}) => ({
  ...extra,
  hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext }
});

test('merge puts the plan-mode context before the end-of-task context', () => {
  // Arrange
  const plan = wrap('PLAN', { systemMessage: 'Plan mode: asking (x)' });
  const task = wrap('TASK');
  // Act
  const result = merge(plan, task);
  // Assert
  assert.equal(result.hookSpecificOutput.additionalContext, 'PLAN\n\nTASK');
  assert.equal(result.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
});

test('merge passes the plan-mode systemMessage through', () => {
  // Arrange
  const plan = wrap('PLAN', { systemMessage: 'Plan mode: exiting (question)' });
  // Act
  const result = merge(plan, wrap('TASK'));
  // Assert
  assert.equal(result.systemMessage, 'Plan mode: exiting (question)');
});

test('merge keeps only the plan-mode output when there are no task steps', () => {
  // Arrange
  const plan = wrap('PLAN', { systemMessage: 'm' });
  // Act
  const result = merge(plan, null);
  // Assert
  assert.equal(result.hookSpecificOutput.additionalContext, 'PLAN');
});

test('merge keeps only the task output and adds no systemMessage', () => {
  // Arrange
  const task = wrap('TASK');
  // Act
  const result = merge(null, task);
  // Assert
  assert.equal(result.hookSpecificOutput.additionalContext, 'TASK');
  assert.equal('systemMessage' in result, false);
});

test('merge returns null when neither hook has output', () => {
  // Arrange
  const none = null;
  // Act
  const result = merge(none, none);
  // Assert
  assert.equal(result, null);
});

test('merge returns null for undefined outputs', () => {
  // Arrange
  const none = undefined;
  // Act
  const result = merge(none, none);
  // Assert
  assert.equal(result, null);
});
