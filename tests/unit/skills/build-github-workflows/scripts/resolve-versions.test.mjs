import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  compareVersions,
  main,
  pickActionTag,
  pickImageTag,
  pickRunnerLabel
} from '../../../../../skills/build-github-workflows/scripts/resolve-versions.mjs';

function run(argv, stdin = '') {
  const out = { logs: [], errors: [] };
  const code = main(argv, { readStdin: () => stdin, log: (t) => out.logs.push(t), error: (t) => out.errors.push(t) });
  return { code, out };
}

describe('compareVersions', () => {
  test('orders numerically, not as strings', () => {
    // Arrange
    const pair = ['v1.10.0', 'v1.9.0'];
    // Act
    const result = compareVersions(...pair);
    // Assert
    assert.ok(result > 0);
  });

  test('treats missing segments as zero', () => {
    // Arrange
    const pair = ['3.12', '3.12.0'];
    // Act
    const result = compareVersions(...pair);
    // Assert
    assert.equal(result, 0);
  });

  test('is negative when the first is lower', () => {
    // Arrange
    const pair = ['v2.0.0', 'v10.0.0'];
    // Act
    const result = compareVersions(...pair);
    // Assert
    assert.ok(result < 0);
  });

  test('is not equal for different patch numbers', () => {
    // Arrange
    const pair = ['1.2.3', '1.2.4'];
    // Act
    const result = compareVersions(...pair);
    // Assert
    assert.notEqual(result, 0);
  });
});

describe('pickActionTag', () => {
  test('takes the highest full tag by semver', () => {
    // Arrange
    const tags = ['v4.2.0', 'v4.10.1', 'v4.9.9'];
    // Act
    const tag = pickActionTag(tags);
    // Assert
    assert.equal(tag, 'v4.10.1');
  });

  test('skips prerelease suffixes and floating majors', () => {
    // Arrange
    const tags = ['v5.0.0-rc.1', 'v5', 'v4.1.0', 'v5.0.0-beta'];
    // Act
    const tag = pickActionTag(tags);
    // Assert
    assert.equal(tag, 'v4.1.0');
  });

  test('returns null when nothing qualifies', () => {
    // Arrange
    const tags = ['v4', 'v5.0.0-dev', 'main'];
    // Act
    const tag = pickActionTag(tags);
    // Assert
    assert.equal(tag, null);
  });

  test('returns null for an empty list', () => {
    // Arrange
    const tags = [];
    // Act
    const tag = pickActionTag(tags);
    // Assert
    assert.equal(tag, null);
  });
});

describe('pickImageTag', () => {
  test('takes the highest tag with the variant', () => {
    // Arrange
    const tags = ['22.11.0-alpine', '22.9.0-alpine', '22.11.0', '23.0.0-slim'];
    // Act
    const tag = pickImageTag(tags, 'alpine');
    // Assert
    assert.equal(tag, '22.11.0-alpine');
  });

  test('without a variant, takes only bare numeric tags', () => {
    // Arrange
    const tags = ['16.4-alpine', '16.3', '16.4-rc1', '15.9'];
    // Act
    const tag = pickImageTag(tags, undefined);
    // Assert
    assert.equal(tag, '16.3');
  });

  test('excludes prerelease and unrelated variants', () => {
    // Arrange
    const tags = ['3.13.0-rc1-alpine', '3.13.0-nightly', '3.12.0-slim'];
    // Act
    const tag = pickImageTag(tags, 'alpine');
    // Assert
    assert.equal(tag, null);
  });

  test('escapes the variant so it is matched literally', () => {
    // Arrange
    const tags = ['1.2.3-aXpine', '1.2.0-a.pine'];
    // Act
    const tag = pickImageTag(tags, 'a.pine');
    // Assert
    assert.equal(tag, '1.2.0-a.pine');
  });
});

describe('pickRunnerLabel', () => {
  test('takes the highest x64 label and the highest LTS', () => {
    // Arrange
    const labels = ['ubuntu-22.04', 'ubuntu-24.04', 'ubuntu-26.10', 'ubuntu-24.04-arm'];
    // Act
    const result = pickRunnerLabel(labels);
    // Assert
    assert.deepEqual(result, { tag: 'ubuntu-26.10', lts: 'ubuntu-24.04' });
  });

  test('takes the -arm form for arm64', () => {
    // Arrange
    const labels = ['ubuntu-24.04', 'ubuntu-22.04-arm', 'ubuntu-24.04-arm'];
    // Act
    const result = pickRunnerLabel(labels, 'arm64');
    // Assert
    assert.deepEqual(result, { tag: 'ubuntu-24.04-arm', lts: 'ubuntu-24.04-arm' });
  });

  test('drops floating, slim, and other-OS labels', () => {
    // Arrange
    const labels = ['ubuntu-latest', 'ubuntu-slim', 'windows-2025', 'macos-15'];
    // Act
    const result = pickRunnerLabel(labels);
    // Assert
    assert.deepEqual(result, { tag: null, lts: null });
  });

  test('reports no LTS when only non-LTS labels exist', () => {
    // Arrange
    const labels = ['ubuntu-25.10', 'ubuntu-26.10'];
    // Act
    const result = pickRunnerLabel(labels);
    // Assert
    assert.deepEqual(result, { tag: 'ubuntu-26.10', lts: null });
  });
});

describe('main', () => {
  test('prints the runner label and LTS, and exits 1 when none qualifies', () => {
    // Arrange
    const argv = ['runner'];
    // Act
    const ok = run(argv, 'ubuntu-22.04 ubuntu-24.04 ubuntu-latest');
    const none = run(argv, 'ubuntu-latest');
    // Assert
    assert.deepEqual(JSON.parse(ok.out.logs[0]), { ok: true, tag: 'ubuntu-24.04', lts: 'ubuntu-24.04' });
    assert.equal(none.code, 1);
  });

  test('rejects an unknown --arch with exit 2', () => {
    // Arrange
    const argv = ['runner', '--arch', 'riscv'];
    // Act
    const { code } = run(argv);
    // Assert
    assert.equal(code, 2);
  });

  test('prints the picked action tag', () => {
    // Arrange
    const argv = ['action'];
    // Act
    const { code, out } = run(argv, 'v1.0.0\nv1.2.0\nv2.0.0-rc1\n');
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(out.logs[0]), { ok: true, tag: 'v1.2.0' });
  });

  test('prints the picked image tag for a variant', () => {
    // Arrange
    const argv = ['image', '--variant', 'slim'];
    // Act
    const { code, out } = run(argv, '3.12.1-slim 3.13.0-slim 3.14.0');
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(out.logs[0]).tag, '3.13.0-slim');
  });

  test('reports no-stable-tag with exit 1', () => {
    // Arrange
    const argv = ['action'];
    // Act
    const { code, out } = run(argv, 'v1 v2 latest');
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(out.logs[0]).errors[0].code, 'no-stable-tag');
  });

  test('rejects an unknown kind or a dangling --variant with exit 2', () => {
    // Arrange
    const bad = [['pins'], ['image', '--variant']];
    // Act
    const results = bad.map((argv) => run(argv));
    // Assert
    assert.deepEqual(
      results.map((r) => r.code),
      [2, 2]
    );
    assert.equal(results[0].out.errors.length, 1);
  });
});
