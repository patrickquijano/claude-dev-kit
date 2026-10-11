import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { classify, decide } from './plan-mode.mjs';

const SCRIPT = fileURLToPath(new URL('./plan-mode.mjs', import.meta.url));
const BIG = 'Implement X across multiple files\n- a\n- b\n- c';
const run = (input) => spawnSync('node', [SCRIPT], { input, encoding: 'utf8' });

test('classify: overrides', () => {
  assert.equal(classify('fix typo #plan').result, 'plan');
  assert.equal(classify('Implement a feature across multiple files #noplan').result, 'noplan');
});

test('classify: questions', () => {
  assert.equal(classify('What does stop.mjs do?').rule, 'question');
  assert.equal(classify('Tell me about hooks?').result, 'noplan');
  assert.equal(classify('How to do it\n- a\n- b\n- c').rule, 'small request');
  assert.equal(classify('Implement this\n- a\n- b\n- c').result, 'plan');
});

test('classify: change verb plus size, list, or scope', () => {
  assert.equal(classify(BIG).rule, 'change with 3+ list items');
  assert.equal(classify(`Add ${'x '.repeat(300)}`).rule, 'long change request');
  assert.equal(classify('Refactor the hooks architecture').rule, 'change with broad scope');
  assert.equal(classify('Add a flag').result, 'noplan');
});

test('classify: default', () => {
  assert.deepEqual(classify('fix typo'), { result: 'noplan', rule: 'small request' });
});

test('decide: enter', () => {
  for (const permission_mode of ['default', 'acceptEdits', 'auto']) {
    assert.equal(decide({ permission_mode, prompt: BIG }).action, 'enter');
  }
});

test('decide: exit', () => {
  assert.equal(decide({ permission_mode: 'plan', prompt: 'What does stop.mjs do?' }).action, 'exit');
  assert.equal(decide({ permission_mode: 'plan', prompt: 'fix typo' }).action, 'exit');
});

test('decide: none', () => {
  assert.equal(decide({ permission_mode: 'plan', prompt: 'Refactor the hooks architecture' }).action, 'none');
  assert.equal(decide({ permission_mode: 'default', prompt: 'fix typo' }).action, 'none');
  assert.equal(decide({ permission_mode: 'default', prompt: '/compact' }).action, 'none');
  assert.equal(decide({ permission_mode: 'default', prompt: '!ls' }).action, 'none');
  assert.equal(decide({ permission_mode: 'default' }).action, 'none');
  assert.equal(decide({ permission_mode: 'bogus', prompt: BIG }).action, 'none');
});

test('cli: enter prints JSON and exits 0', () => {
  const r = run(JSON.stringify({ permission_mode: 'default', prompt: BIG }));
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.match(out.systemMessage, /^Plan mode: entering/);
  assert.equal(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(out.hookSpecificOutput.additionalContext, /EnterPlanMode/);
});

test('cli: exit prints JSON', () => {
  const r = run(JSON.stringify({ permission_mode: 'plan', prompt: 'What does stop.mjs do?' }));
  assert.equal(r.status, 0);
  assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /ExitPlanMode/);
});

test('cli: none and invalid JSON print nothing', () => {
  const none = run(JSON.stringify({ permission_mode: 'default', prompt: 'fix typo' }));
  assert.equal(none.status, 0);
  assert.equal(none.stdout, '');
  const bad = run('not json');
  assert.equal(bad.status, 0);
  assert.equal(bad.stdout, '');
});
