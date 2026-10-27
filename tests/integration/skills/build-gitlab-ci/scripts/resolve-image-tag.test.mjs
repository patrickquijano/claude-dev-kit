import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';

const SCRIPT = resolve('skills/build-gitlab-ci/scripts/resolve-image-tag.mjs');

const dirs = [];
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const stubs = (tools) => {
  const dir = mkdtempSync(join(tmpdir(), 'resolve-image-tag-'));
  dirs.push(dir);
  for (const [name, body] of Object.entries(tools)) {
    writeFileSync(join(dir, name), body);
    chmodSync(join(dir, name), 0o755);
  }
  return dir;
};
const run = (dir, ...args) =>
  spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    timeout: 30_000,
    env: { PATH: `${dir}:/usr/bin:/bin` }
  });
const crane = (tags) => `#!/bin/sh\nprintf '%s\\n' ${tags.map((tag) => `'${tag}'`).join(' ')}\n`;

describe('resolve-image-tag.mjs', () => {
  test('picks the highest stable tag', () => {
    // Arrange
    const dir = stubs({ crane: crane(['1.2.3', '1.10.0', '1.9.9', 'latest']) });
    // Act
    const result = run(dir, 'example/app');
    // Assert
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout), {
      image: 'example/app',
      tag: '1.10.0',
      method: 'crane',
      tried: ['crane']
    });
  });

  test('rejects a bad image name', () => {
    // Arrange
    const dir = stubs({ crane: crane(['1.0.0']) });
    // Act
    const result = run(dir, 'bad name; rm -rf /');
    // Assert
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
  });
});
