import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';

const SCRIPT = resolve('skills/build-hook/assets/hook-template.mjs');
const run = (input) => spawnSync('node', [SCRIPT], { input, encoding: 'utf8', timeout: 30_000 });

const dirs = [];
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe('hook-template CLI', () => {
  test('runs through a symlink to the script', () => {
    // Arrange
    const dir = mkdtempSync(join(tmpdir(), 'hook-template-'));
    dirs.push(dir);
    const link = join(dir, 'link.mjs');
    symlinkSync(SCRIPT, link);
    // Act
    const result = spawnSync('node', [link], {
      input: '{"hook_event_name":"Stop"}',
      encoding: 'utf8',
      timeout: 30_000
    });
    // Assert
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout), { systemMessage: 'Stop: 0 steps ok' });
  });

  test('exits 0 with one JSON line for a valid event', () => {
    // Arrange
    const input = '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"ls"}}';
    // Act
    const result = run(input);
    // Assert
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout), { systemMessage: 'PreToolUse: 0 steps ok' });
  });

  test('exits 1 with one stderr line on invalid JSON', () => {
    // Arrange
    const input = 'garbage';
    // Act
    const result = run(input);
    // Assert
    assert.equal(result.status, 1);
    assert.equal(result.stderr.trim().split('\n').length, 1);
    assert.equal(result.stdout, '');
  });

  test('exits 1 when hook_event_name is missing', () => {
    // Arrange
    const input = '{}';
    // Act
    const result = run(input);
    // Assert
    assert.equal(result.status, 1);
    assert.match(result.stderr, /hook_event_name/);
  });
});
