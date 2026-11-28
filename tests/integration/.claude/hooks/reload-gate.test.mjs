import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const script = (name) => join(ROOT, '.claude/hooks', name);
const SESSION = `it-${process.pid}`;
const MARKER = join(tmpdir(), `cdk-reload-${SESSION}.json`);
const run = (name, event) =>
  spawnSync('node', [script(name)], {
    input: JSON.stringify({ session_id: SESSION, ...event }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
    timeout: 15_000
  });
const arm = () => writeFileSync(MARKER, JSON.stringify([{ file: 'skills/a.md', command: '/reload-plugins' }]));

after(() => rmSync(MARKER, { force: true }));

test('cli: a pending reload blocks a Read with exit 2 naming the unlock', () => {
  // Arrange
  arm();
  // Act
  const r = run('pre-tool-use.mjs', { tool_name: 'Read', tool_input: { file_path: '/x' } });
  // Assert
  assert.equal(r.status, 2);
  assert.match(r.stderr, /skills\/a\.md changed.*\/reload-plugins.*! rm /);
});

test('cli: typing /reload-plugins clears the marker and unblocks tools', () => {
  // Arrange
  arm();
  // Act
  const typed = run('user-prompt-submit.mjs', { prompt: '/reload-plugins' });
  const after = run('pre-tool-use.mjs', { tool_name: 'Read', tool_input: { file_path: '/x' } });
  // Assert
  assert.equal(typed.status, 0);
  assert.equal(existsSync(MARKER), false);
  assert.equal(after.status, 0);
});

test('cli: an ordinary prompt keeps the marker', () => {
  // Arrange
  arm();
  // Act
  const r = run('user-prompt-submit.mjs', { prompt: 'hello' });
  // Assert
  assert.equal(r.status, 0);
  assert.equal(existsSync(MARKER), true);
});

test('cli: no marker lets a tool run', () => {
  // Arrange
  rmSync(MARKER, { force: true });
  // Act
  const r = run('pre-tool-use.mjs', { tool_name: 'Read', tool_input: { file_path: '/x' } });
  // Assert
  assert.equal(r.status, 0);
});
