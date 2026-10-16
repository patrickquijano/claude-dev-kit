import assert from 'node:assert/strict';
import { test } from 'node:test';
import { unitTestCommand } from '../../../../../hooks/scripts/lib/unit-tests.mjs';

// files: name → content; a file in `files` exists, anything else is ENOENT.
function make(files = {}, { readError = null } = {}) {
  const key = (p) => p.split('/').pop();
  return {
    existsSync: (p) => key(p) in files,
    readFileSync: (p) => {
      if (readError && key(p) === 'package.json') throw readError;
      if (!(key(p) in files)) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      return files[key(p)];
    }
  };
}
const pkg = (scripts) => JSON.stringify({ scripts });

test('unitTestCommand prefers test:unit and uses the lockfile package manager', () => {
  // Arrange
  const deps = make({ 'package.json': pkg({ 'test:unit': 'x', test: 'y' }), 'pnpm-lock.yaml': '' });
  // Act
  const result = unitTestCommand('/repo', deps);
  // Assert
  assert.equal(result, 'pnpm run test:unit');
});

test('unitTestCommand falls back to the test script with npm by default', () => {
  // Arrange
  const deps = make({ 'package.json': pkg({ test: 'vitest' }) });
  // Act
  const result = unitTestCommand('/repo', deps);
  // Assert
  assert.equal(result, 'npm test');
});

test('unitTestCommand detects yarn and bun lockfiles', () => {
  // Arrange
  const yarn = make({ 'package.json': pkg({ test: 'x' }), 'yarn.lock': '' });
  const bun = make({ 'package.json': pkg({ test: 'x' }), 'bun.lockb': '' });
  // Act
  const results = [unitTestCommand('/r', yarn), unitTestCommand('/r', bun)];
  // Assert
  assert.deepEqual(results, ['yarn test', 'bun run test']);
});

test('unitTestCommand detects pytest from pytest.ini or pyproject.toml', () => {
  // Arrange
  const ini = make({ 'pytest.ini': '' });
  const toml = make({ 'pyproject.toml': '[tool.pytest.ini_options]\n' });
  // Act
  const results = [unitTestCommand('/r', ini), unitTestCommand('/r', toml)];
  // Assert
  assert.deepEqual(results, ['pytest', 'pytest']);
});

test('unitTestCommand detects go, cargo, and phpunit projects', () => {
  // Arrange
  const go = make({ 'go.mod': '' });
  const cargo = make({ 'Cargo.toml': '' });
  const php = make({ 'phpunit.xml.dist': '' });
  // Act
  const results = [unitTestCommand('/r', go), unitTestCommand('/r', cargo), unitTestCommand('/r', php)];
  // Assert
  assert.deepEqual(results, ['go test ./...', 'cargo test', 'vendor/bin/phpunit']);
});

test('unitTestCommand ignores the npm stub test script', () => {
  // Arrange
  const deps = make({ 'package.json': pkg({ test: 'echo "Error: no test specified" && exit 1' }) });
  // Act
  const result = unitTestCommand('/repo', deps);
  // Assert
  assert.equal(result, null);
});

test('unitTestCommand returns null when no marker exists', () => {
  // Arrange
  const deps = make();
  // Act
  const result = unitTestCommand('/repo', deps);
  // Assert
  assert.equal(result, null);
});

test('unitTestCommand skips a corrupt package.json and checks the other markers', () => {
  // Arrange
  const deps = make({ 'package.json': '{oops', 'go.mod': '' });
  // Act
  const result = unitTestCommand('/repo', deps);
  // Assert
  assert.equal(result, 'go test ./...');
});

test('unitTestCommand ignores a pyproject.toml without a pytest table', () => {
  // Arrange
  const deps = make({ 'pyproject.toml': '[project]\nname = "x"\n' });
  // Act
  const result = unitTestCommand('/repo', deps);
  // Assert
  assert.equal(result, null);
});

test('unitTestCommand rethrows an unexpected read error', () => {
  // Arrange
  const deps = make({ 'package.json': '{}' }, { readError: Object.assign(new Error('boom'), { code: 'EIO' }) });
  // Act
  const act = () => unitTestCommand('/repo', deps);
  // Assert
  assert.throws(act, /boom/);
});
