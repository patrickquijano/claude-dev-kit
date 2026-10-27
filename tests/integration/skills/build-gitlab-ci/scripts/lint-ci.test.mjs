import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';

const SCRIPT = resolve('skills/build-gitlab-ci/scripts/lint-ci.mjs');

const dirs = [];
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const repo = () => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-ci-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'repo/.gitlab/ci'), { recursive: true });
  mkdirSync(join(dir, 'bin'));
  writeFileSync(
    join(dir, 'repo/.gitlab-ci.yml'),
    "stages:\n  - test\ninclude:\n  - local: '/.gitlab/ci/*.gitlab-ci.yml'\n"
  );
  writeFileSync(
    join(dir, 'repo/.gitlab/ci/unit-test.gitlab-ci.yml'),
    '---\nunit-test:\n  stage: test\n  script:\n    - true\n'
  );
  return dir;
};
const stub = (dir, name, body) => {
  writeFileSync(join(dir, 'bin', name), `#!/bin/sh\n${body}\n`);
  chmodSync(join(dir, 'bin', name), 0o755);
};
const run = (dir) =>
  spawnSync(process.execPath, [SCRIPT, join(dir, 'repo')], {
    encoding: 'utf8',
    timeout: 30_000,
    env: { PATH: `${join(dir, 'bin')}:/usr/bin:/bin` }
  });

describe('lint-ci.mjs', () => {
  test('merges job files without the local include and exits 0 when valid', () => {
    // Arrange
    const dir = repo();
    const capture = join(dir, 'captured.yml');
    stub(dir, 'glab', `cp "$3" "${capture}"\necho 'CI/CD YAML is valid'`);
    // Act
    const result = run(dir);
    // Assert
    assert.equal(result.status, 0);
    assert.match(result.stdout, /^method=glab/);
    const merged = readFileSync(capture, 'utf8');
    assert.match(merged, /unit-test:/);
    assert.doesNotMatch(merged, /local:/);
    assert.doesNotMatch(merged, /^include:/m);
    assert.doesNotMatch(merged, /^---$/m);
  });

  test('exits 1 and prints the raw message when invalid', () => {
    // Arrange
    const dir = repo();
    stub(dir, 'glab', "echo 'jobs:unit-test config contains unknown keys: foo'\nexit 1");
    // Act
    const result = run(dir);
    // Assert
    assert.equal(result.status, 1);
    assert.match(result.stdout, /unknown keys: foo/);
  });

  test('falls back to syntax checking when glab is not authenticated', () => {
    // Arrange
    const dir = repo();
    stub(dir, 'glab', "echo '401 Unauthorized' >&2\nexit 1");
    stub(dir, 'yamllint', 'exit 0');
    // Act
    const result = run(dir);
    // Assert
    assert.equal(result.status, 0);
    assert.match(result.stdout, /method=yamllint scope=syntax/);
  });
});
