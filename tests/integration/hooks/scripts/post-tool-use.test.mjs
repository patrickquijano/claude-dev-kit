import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../../../hooks/scripts/post-tool-use.mjs', import.meta.url));
const run = (input) => spawnSync('node', [SCRIPT], { input, encoding: 'utf8', timeout: 15_000 });

test('cli: invalid JSON prints one stderr line, nothing on stdout, and exits 1', () => {
  // Arrange
  const input = 'not json';
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /^cdk post-tool-use: .+\n$/);
});

test('cli: a missing file prints nothing and exits 0', () => {
  // Arrange
  const input = JSON.stringify({ tool_input: { file_path: '/nonexistent/dir/a.md' } });
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('cli: input without a file path prints nothing', () => {
  // Arrange
  const input = JSON.stringify({ tool_input: {} });
  // Act
  const r = run(input);
  // Assert
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});
