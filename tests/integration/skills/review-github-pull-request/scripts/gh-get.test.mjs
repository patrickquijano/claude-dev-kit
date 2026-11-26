import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';

const SCRIPT = resolve('skills/review-github-pull-request/scripts/gh-get.mjs');

const dirs = [];
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const setup = (ghBody) => {
  const dir = mkdtempSync(join(tmpdir(), 'gh-get-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'bin'));
  writeFileSync(join(dir, 'bin', 'gh'), `#!/bin/sh\n${ghBody}\n`);
  chmodSync(join(dir, 'bin', 'gh'), 0o755);
  return dir;
};
const run = (dir, args) =>
  spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    timeout: 30_000,
    env: { PATH: `${join(dir, 'bin')}:/usr/bin:/bin` }
  });

describe('gh-get.mjs graphql', () => {
  test('passes the frozen query and variables to gh and prints its output', () => {
    // Arrange
    const dir = setup(`printf '%s\\n' "$@" > "${'$'}{0%/*}/../argv.txt"\necho '{"data":{}}'`);
    // Act
    const res = run(dir, ['graphql', 'review-threads', 'acme', 'app', '42']);
    // Assert
    const argv = readFileSync(join(dir, 'argv.txt'), 'utf8').split('\n');
    assert.equal(res.status, 0);
    assert.equal(res.stdout.trim(), '{"data":{}}');
    assert.deepEqual([argv[0], argv[1], argv[2]], ['api', 'graphql', '-f']);
    assert.ok(argv[3].startsWith('query=query($o:String!'));
    assert.deepEqual(argv.slice(4, 10), ['-f', 'o=acme', '-f', 'r=app', '-F', 'n=42']);
  });

  test('exits 2 without running gh for a bad owner', () => {
    // Arrange
    const dir = setup(`touch "${'$'}{0%/*}/../ran"`);
    // Act
    const res = run(dir, ['graphql', 'review-threads', '-acme', 'app', '42']);
    // Assert
    assert.equal(res.status, 2);
    assert.equal(existsSync(join(dir, 'ran')), false);
  });

  test('exits 1 when gh fails', () => {
    // Arrange
    const dir = setup("echo 'gh: boom' >&2\nexit 1");
    // Act
    const res = run(dir, ['graphql', 'review-threads', 'acme', 'app', '42']);
    // Assert
    assert.equal(res.status, 1);
    assert.match(res.stderr, /gh: boom/);
  });
});
