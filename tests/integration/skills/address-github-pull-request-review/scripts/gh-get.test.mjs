import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';

const SCRIPT = resolve('skills/address-github-pull-request-review/scripts/gh-get.mjs');

const dirs = [];
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const setup = (ghBody) => {
  const dir = mkdtempSync(join(tmpdir(), 'gh-get-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'bin'));
  writeFileSync(join(dir, 'bin/gh'), `#!/bin/sh\n${ghBody}\n`);
  chmodSync(join(dir, 'bin/gh'), 0o755);
  return dir;
};
const run = (dir, args) =>
  spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    timeout: 30_000,
    env: { PATH: `${join(dir, 'bin')}:/usr/bin:/bin` }
  });

describe('gh-get.mjs graphql', () => {
  test('exits 0, prints the body, and passes the fixed argv to gh', () => {
    // Arrange
    const dir = setup('true');
    const capture = join(dir, 'argv.txt');
    writeFileSync(join(dir, 'bin/gh'), `#!/bin/sh\nprintf '%s\\n' "$@" > "${capture}"\necho '{"data":{}}'\n`);
    // Act
    const res = run(dir, ['graphql', 'review-threads', 'acme', 'app', '5', 'abc123==']);
    // Assert
    const argv = readFileSync(capture, 'utf8').split('\n');
    assert.equal(res.status, 0);
    assert.equal(res.stdout.trim(), '{"data":{}}');
    assert.deepEqual([argv[0], argv[1], argv[2]], ['api', 'graphql', '-f']);
    assert.ok(argv[3].startsWith('query=query('));
    assert.deepEqual(argv.slice(4, 12), ['-f', 'o=acme', '-f', 'r=app', '-F', 'n=5', '-f', 'c=abc123==']);
  });

  test('exits 2 and never runs gh for a bad owner', () => {
    // Arrange
    const dir = setup('true');
    const capture = join(dir, 'ran');
    writeFileSync(join(dir, 'bin/gh'), `#!/bin/sh\ntouch "${capture}"\n`);
    // Act
    const res = run(dir, ['graphql', 'pr-files', '-bad', 'app', '5']);
    // Assert
    assert.equal(res.status, 2);
    assert.equal(existsSync(capture), false);
  });

  test('exits 1 with the gh error line when gh fails', () => {
    // Arrange
    const dir = setup("echo 'gh: HTTP 401' >&2\nexit 1");
    // Act
    const res = run(dir, ['graphql', 'pr-files', 'acme', 'app', '5']);
    // Assert
    assert.equal(res.status, 1);
    assert.match(res.stderr, /gh: HTTP 401/);
  });
});
