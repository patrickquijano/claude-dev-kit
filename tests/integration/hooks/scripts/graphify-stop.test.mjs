import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../../../hooks/scripts/graphify-stop.mjs', import.meta.url));
const dirs = [];
const run = (input) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'gstop-'));
  dirs.push(dir);
  return spawnSync('node', [SCRIPT], { input, env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
};

after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

test('a project without Graphify setup prints nothing', () => {
  // Arrange
  const input = JSON.stringify({ session_id: 'gs-1' });
  // Act
  const result = run(input);
  // Assert
  assert.equal(result.stdout, '');
  assert.equal(result.status, 0);
});

test('invalid stdin prints nothing and exits 0', () => {
  // Arrange
  const input = 'not json';
  // Act
  const result = run(input);
  // Assert
  assert.equal(result.stdout, '');
  assert.equal(result.status, 0);
});
