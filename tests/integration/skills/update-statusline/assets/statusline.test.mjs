import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';

const SCRIPT = resolve('skills/update-statusline/assets/statusline.mjs');
const run = (input, env = {}) => {
  const childEnv = { ...process.env, NO_COLOR: '1', ...env };
  for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']) {
    delete childEnv[name];
  }

  return spawnSync('node', [SCRIPT], { encoding: 'utf8', input, timeout: 30_000, env: childEnv });
};

describe('statusline CLI', () => {
  let root;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'statusline-'));
  });
  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test('prints the directory and model from the stdin payload', () => {
    // Arrange
    const payload = JSON.stringify({ cwd: root, model: { display_name: 'Model' } });

    // Act
    const result = run(payload);

    // Assert
    assert.equal(result.status, 0);
    assert.equal(result.stdout, `${basename(root)} │ Model`);
  });

  test('prints nothing for empty stdin', () => {
    // Act
    const result = run('');

    // Assert
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });

  test('prints nothing for invalid JSON', () => {
    // Act
    const result = run('{not json');

    // Assert
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });

  test('prints nothing for a null payload', () => {
    // Act
    const result = run('null');

    // Assert
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });

  test('prints color escapes when NO_COLOR is unset', () => {
    // Arrange
    const payload = JSON.stringify({ cwd: root });

    // Act
    const result = run(payload, { NO_COLOR: '' });

    // Assert
    assert.ok(result.stdout.includes(String.fromCharCode(27)));
  });
});
