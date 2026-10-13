// Detects a project's runnable unit-test command for the end-of-task hook; root only, no shell.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expected } from './hook-io.mjs';

// Side effects as a swappable bundle so tests never touch the fs.
export const realDeps = { existsSync, readFileSync };

const NPM_STUB = /no test specified/;

function packageManager(cwd, deps) {
  const has = (f) => deps.existsSync(path.join(cwd, f));
  if (has('pnpm-lock.yaml')) return 'pnpm';
  if (has('yarn.lock')) return 'yarn';
  if (has('bun.lock') || has('bun.lockb')) return 'bun';
  return 'npm';
}

// The `package.json` scripts object, or null when the file is missing or corrupt.
function readScripts(cwd, deps) {
  try {
    const pkg = JSON.parse(deps.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    return pkg && typeof pkg.scripts === 'object' && pkg.scripts ? pkg.scripts : null;
  } catch (e) {
    if (e instanceof SyntaxError || expected(e, 'ENOENT', 'ENOTDIR')) return null;
    throw e;
  }
}

function pytestConfigured(cwd, deps) {
  if (deps.existsSync(path.join(cwd, 'pytest.ini'))) return true;
  try {
    return deps.readFileSync(path.join(cwd, 'pyproject.toml'), 'utf8').includes('[tool.pytest');
  } catch (e) {
    if (expected(e, 'ENOENT', 'ENOTDIR')) return false;
    throw e;
  }
}

// The unit-test command for the project root, or null when none is detected.
export function unitTestCommand(cwd, deps = realDeps) {
  const scripts = readScripts(cwd, deps);
  if (scripts) {
    const pm = packageManager(cwd, deps);
    if (typeof scripts['test:unit'] === 'string') return `${pm} run test:unit`;
    if (typeof scripts.test === 'string' && !NPM_STUB.test(scripts.test)) return `${pm} test`;
  }
  if (pytestConfigured(cwd, deps)) return 'pytest';
  const has = (f) => deps.existsSync(path.join(cwd, f));
  if (has('go.mod')) return 'go test ./...';
  if (has('Cargo.toml')) return 'cargo test';
  if (has('phpunit.xml') || has('phpunit.xml.dist')) return 'vendor/bin/phpunit';
  return null;
}
