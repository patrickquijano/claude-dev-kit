import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../../../hooks/scripts/session-start.mjs', import.meta.url));
const dirs = [];
const project = () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ss-'));
  dirs.push(dir);
  return dir;
};
const run = (dir, input) =>
  spawnSync('node', [SCRIPT], { input, env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });

after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

test('startup input prints one SessionStart JSON object with the date line', () => {
  // Arrange
  const dir = project();
  // Act
  const result = run(dir, JSON.stringify({ source: 'startup', session_id: `ss-${process.pid}` }));
  // Assert
  const out = JSON.parse(result.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(out.hookSpecificOutput.additionalContext, /^Today is /);
});

test('invalid stdin still prints the date line', () => {
  // Arrange
  const dir = project();
  // Act
  const result = run(dir, 'not json');
  // Assert
  assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /^Today is /);
});

test('a project without Graphify gets no Graphify rules', () => {
  // Arrange
  const dir = project();
  // Act
  const result = run(dir, '{}');
  // Assert
  assert.doesNotMatch(result.stdout, /Graphify/);
});
