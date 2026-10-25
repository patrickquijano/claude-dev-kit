import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  detectPackage,
  main,
  managerFromField,
  sanitizeName
} from '../../../../../skills/setup-format-lint/scripts/pm-detect.mjs';

// Stub deps over an in-memory file map of absolute path -> content.
const fsStub = (files) => ({
  existsSync: (p) => p in files,
  readFileSync: (p) => files[p]
});

describe('sanitizeName', () => {
  test('lowercases and replaces other characters with a dash', () => {
    // Arrange
    const input = 'My App!!v2';
    // Act
    const name = sanitizeName(input);
    // Assert
    assert.equal(name, 'my-app-v2');
  });

  test('trims leading dot, underscore, and dash', () => {
    // Arrange
    const input = '._-site';
    // Act
    const name = sanitizeName(input);
    // Assert
    assert.equal(name, 'site');
  });

  test('returns project for an empty result', () => {
    // Arrange
    const input = '...';
    // Act
    const name = sanitizeName(input);
    // Assert
    assert.equal(name, 'project');
  });

  test('keeps a valid name unchanged', () => {
    // Arrange
    const input = 'web_app-1.0';
    // Act
    const name = sanitizeName(input);
    // Assert
    assert.equal(name, 'web_app-1.0');
  });
});

describe('managerFromField', () => {
  test('takes the name before the at sign', () => {
    // Arrange
    const field = 'pnpm@9.1.0+sha512.abc';
    // Act
    const manager = managerFromField(field);
    // Assert
    assert.equal(manager, 'pnpm');
  });

  test('accepts a bare name', () => {
    // Arrange
    const field = 'bun';
    // Act
    const manager = managerFromField(field);
    // Assert
    assert.equal(manager, 'bun');
  });

  test('returns undefined for an unknown manager', () => {
    // Arrange
    const field = 'deno@2.0.0';
    // Act
    const manager = managerFromField(field);
    // Assert
    assert.equal(manager, undefined);
  });

  test('returns undefined for a non-string', () => {
    // Arrange
    const field = undefined;
    // Act
    const manager = managerFromField(field);
    // Assert
    assert.equal(manager, undefined);
  });
});

describe('detectPackage', () => {
  test('uses the root for a workspaces package.json', () => {
    // Arrange
    const deps = fsStub({
      '/r/package.json': '{"workspaces":["a"]}',
      '/r/a/package.json': '{}',
      '/r/pnpm-lock.yaml': ''
    });
    // Act
    const result = detectPackage('/r', '/r/a', deps);
    // Assert
    assert.equal(result.pkg, '.');
    assert.equal(result.manager, 'pnpm');
    assert.equal(result.source, 'lockfile');
  });

  test('prefers the packageManager field over a lockfile', () => {
    // Arrange
    const deps = fsStub({ '/r/package.json': '{"packageManager":"yarn@4.1.0"}', '/r/package-lock.json': '' });
    // Act
    const result = detectPackage('/r', '/r', deps);
    // Assert
    assert.equal(result.manager, 'yarn');
    assert.equal(result.source, 'packageManager');
  });

  test('finds the nearest package.json below the root', () => {
    // Arrange
    const deps = fsStub({ '/r/app/package.json': '{}', '/r/app/src': '' });
    // Act
    const result = detectPackage('/r', '/r/app/src', deps);
    // Assert
    assert.equal(result.dir, '/r/app');
    assert.equal(result.pkg, 'app');
    assert.equal(result.packageJson, true);
  });

  test('defaults to npm with no lockfile and names a missing package.json', () => {
    // Arrange
    const deps = fsStub({});
    // Act
    const result = detectPackage('/work/My Repo', '/work/My Repo', deps);
    // Assert
    assert.equal(result.manager, 'npm');
    assert.equal(result.source, 'default');
    assert.equal(result.packageJson, false);
    assert.equal(result.name, 'my-repo');
  });

  test('reports unknown for lockfiles of several managers in one dir', () => {
    // Arrange
    const deps = fsStub({ '/r/package.json': '{}', '/r/yarn.lock': '', '/r/package-lock.json': '' });
    // Act
    const result = detectPackage('/r', '/r', deps);
    // Assert
    assert.equal(result.manager, 'unknown');
    assert.deepEqual(result.lockfiles, ['yarn.lock', 'package-lock.json']);
  });

  test('counts bun.lock and bun.lockb as one manager', () => {
    // Arrange
    const deps = fsStub({ '/r/package.json': '{}', '/r/bun.lock': '', '/r/bun.lockb': '' });
    // Act
    const result = detectPackage('/r', '/r', deps);
    // Assert
    assert.equal(result.manager, 'bun');
  });

  test('falls back to a root lockfile when the package dir has none', () => {
    // Arrange
    const deps = fsStub({ '/r/app/package.json': '{}', '/r/yarn.lock': '' });
    // Act
    const result = detectPackage('/r', '/r/app', deps);
    // Assert
    assert.equal(result.manager, 'yarn');
  });
});

describe('main', () => {
  test('prints JSON and returns 0 for a valid root', () => {
    // Arrange
    const out = [];
    const deps = { ...fsStub({ '/r/package.json': '{}' }), log: (t) => out.push(t), error: () => {} };
    // Act
    const code = main(['--root', '/r'], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(out[0]).manager, 'npm');
  });

  test('returns 2 for a missing root', () => {
    // Arrange
    const errs = [];
    const deps = { ...fsStub({}), log: () => {}, error: (t) => errs.push(t) };
    // Act
    const code = main([], deps);
    // Assert
    assert.equal(code, 2);
    assert.match(errs[0], /usage/);
  });

  test('returns 2 for a relative root', () => {
    // Arrange
    const deps = { ...fsStub({}), log: () => {}, error: () => {} };
    // Act
    const code = main(['--root', 'rel'], deps);
    // Assert
    assert.equal(code, 2);
  });
});
