import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classify, decide, output } from '../../../../hooks/scripts/plan-mode.mjs';

const BIG = 'Implement X across multiple files\n- a\n- b\n- c';

test('classify: #plan asks', () => {
  // Arrange
  const prompt = 'fix typo #plan';
  // Act
  const result = classify(prompt);
  // Assert
  assert.deepEqual(result, { result: 'plan', rule: 'override #plan' });
});

test('classify: a plain prompt asks', () => {
  // Arrange
  const prompt = 'Add a flag';
  // Act
  const result = classify(prompt);
  // Assert
  assert.deepEqual(result, { result: 'plan', rule: 'every prompt' });
});

test('classify: a question asks', () => {
  // Arrange
  const prompt = 'What does stop.mjs do?';
  // Act
  const result = classify(prompt);
  // Assert
  assert.deepEqual(result, { result: 'plan', rule: 'every prompt' });
});

test('classify: #noplan does not ask', () => {
  // Arrange
  const prompt = 'Implement a feature across multiple files #noplan';
  // Act
  const result = classify(prompt);
  // Assert
  assert.deepEqual(result, { result: 'noplan', rule: 'override #noplan' });
});

test('classify: #noplan wins over a large change', () => {
  // Arrange
  const prompt = `${BIG} #noplan`;
  // Act
  const result = classify(prompt);
  // Assert
  assert.equal(result.result, 'noplan');
});

for (const permission_mode of ['default', 'acceptEdits', 'auto']) {
  test(`decide: enters plan mode from ${permission_mode} for a large change`, () => {
    // Arrange
    const event = { permission_mode, prompt: BIG };
    // Act
    const result = decide(event);
    // Assert
    assert.equal(result.action, 'enter');
  });
}

test('decide: exits plan mode only on #noplan', () => {
  // Arrange
  const event = { permission_mode: 'plan', prompt: 'Fix the typo #noplan' };
  // Act
  const result = decide(event);
  // Assert
  assert.deepEqual(result, { action: 'exit', rule: 'override #noplan' });
});

test('decide: exits plan mode on #noplan even for a broad change', () => {
  // Arrange
  const event = { permission_mode: 'plan', prompt: 'Refactor across multiple files #noplan' };
  // Act
  const result = decide(event);
  // Assert
  assert.equal(result.action, 'exit');
});

test('decide: stays in plan mode for a question', () => {
  // Arrange
  const event = { permission_mode: 'plan', prompt: 'What does stop.mjs do?' };
  // Act
  const result = decide(event);
  // Assert
  assert.equal(result.action, 'none');
});

test('decide: stays in plan mode for a small request', () => {
  // Arrange
  const event = { permission_mode: 'plan', prompt: 'Go with option B' };
  // Act
  const result = decide(event);
  // Assert
  assert.equal(result.action, 'none');
});

test('decide: #noplan outside plan mode does nothing', () => {
  // Arrange
  const event = { permission_mode: 'default', prompt: 'Fix the typo #noplan' };
  // Act
  const result = decide(event);
  // Assert
  assert.equal(result.action, 'none');
});

test('decide: stays in plan mode for a broad change', () => {
  // Arrange
  const event = { permission_mode: 'plan', prompt: 'Refactor the hooks architecture' };
  // Act
  const result = decide(event);
  // Assert
  assert.equal(result.action, 'none');
});

for (const prompt of ['fix typo', 'What does X do?']) {
  test(`decide: enters plan mode in default mode for "${prompt}"`, () => {
    // Arrange
    const event = { permission_mode: 'default', prompt };
    // Act
    const result = decide(event);
    // Assert
    assert.deepEqual(result, { action: 'enter', rule: 'every prompt' });
  });
}

for (const prompt of ['<task-notification>\n<task-id>a1</task-id>', '<agent-message from="a1">\nhi']) {
  test(`decide: ignores the machine-started prompt ${prompt.slice(0, 18)}`, () => {
    // Arrange
    const event = { permission_mode: 'default', prompt };
    // Act
    const result = decide(event);
    // Assert
    assert.deepEqual(result, { action: 'none' });
  });
}

for (const prompt of ['/compact', '!ls']) {
  test(`decide: ignores the command prompt ${prompt}`, () => {
    // Arrange
    const event = { permission_mode: 'default', prompt };
    // Act
    const result = decide(event);
    // Assert
    assert.deepEqual(result, { action: 'none' });
  });
}

test('decide: ignores an event with no prompt', () => {
  // Arrange
  const event = { permission_mode: 'default' };
  // Act
  const result = decide(event);
  // Assert
  assert.deepEqual(result, { action: 'none' });
});

test('decide: ignores an unknown permission mode', () => {
  // Arrange
  const event = { permission_mode: 'bogus', prompt: BIG };
  // Act
  const result = decide(event);
  // Assert
  assert.deepEqual(result, { action: 'none' });
});

test('output: asks Claude to call EnterPlanMode on enter', () => {
  // Arrange
  const decision = { action: 'enter', rule: 'long change request' };
  // Act
  const out = output(decision);
  // Assert
  assert.equal(out.systemMessage, 'Plan mode: suggesting (long change request)');
  assert.equal(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(out.hookSpecificOutput.additionalContext, /AskUserQuestion/);
  assert.match(out.hookSpecificOutput.additionalContext, /EnterPlanMode/);
  assert.match(out.hookSpecificOutput.additionalContext, /long change request/);
});

test('output: asks Claude to call ExitPlanMode on exit', () => {
  // Arrange
  const decision = { action: 'exit', rule: 'override #noplan' };
  // Act
  const out = output(decision);
  // Assert
  assert.match(out.systemMessage, /^Plan mode: exiting/);
  assert.match(out.hookSpecificOutput.additionalContext, /ExitPlanMode/);
  assert.doesNotMatch(out.hookSpecificOutput.additionalContext, /plan file/);
});

test('output: prints nothing for action none', () => {
  // Arrange
  const decision = { action: 'none', rule: 'override #noplan' };
  // Act
  const out = output(decision);
  // Assert
  assert.equal(out, null);
});

test('output: prints nothing for action none without a rule', () => {
  // Arrange
  const decision = { action: 'none' };
  // Act
  const out = output(decision);
  // Assert
  assert.equal(out, null);
});
