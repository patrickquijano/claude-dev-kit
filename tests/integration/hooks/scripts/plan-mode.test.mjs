import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../../../hooks/scripts/plan-mode.mjs', import.meta.url));
const BIG = 'Implement X across multiple files\n- a\n- b\n- c';
const run = (input) => spawnSync('node', [SCRIPT], { input, encoding: 'utf8', timeout: 15_000 });

test('cli: enter prints JSON and exits 0', () => {
  // Arrange
  const input = JSON.stringify({ permission_mode: 'default', prompt: BIG });
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.match(out.systemMessage, /^Plan mode: entering/);
  assert.equal(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(out.hookSpecificOutput.additionalContext, /EnterPlanMode/);
});

test('cli: exit prints JSON', () => {
  // Arrange
  const input = JSON.stringify({ permission_mode: 'plan', prompt: 'What does stop.mjs do?' });
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 0);
  assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /ExitPlanMode/);
});

test('cli: a small request prints nothing', () => {
  // Arrange
  const input = JSON.stringify({ permission_mode: 'default', prompt: 'fix typo' });
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('cli: invalid JSON prints nothing and exits 0', () => {
  // Arrange
  const input = 'not json';
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});
