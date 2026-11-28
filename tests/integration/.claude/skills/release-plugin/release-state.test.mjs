import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(
  new URL('../../../../../.claude/skills/release-plugin/scripts/release-state.mjs', import.meta.url)
);
const HANDLERS = fileURLToPath(
  new URL('../../../../../.claude/skills/release-plugin/scripts/failure-handlers.mjs', import.meta.url)
);
const SKILL = readFileSync(
  fileURLToPath(new URL('../../../../../.claude/skills/release-plugin/SKILL.md', import.meta.url)),
  'utf8'
);
const dirs = [];
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'cdk-release-'));
  dirs.push(dir);
  return dir;
};
const state = (root, ...args) => spawnSync('node', [SCRIPT, root, ...args], { encoding: 'utf8', timeout: 15_000 });

after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

test('cli: mark then resume round-trips through .release/state.json', () => {
  // Arrange
  const root = temp();
  state(root, 'mark', '1', 'done');
  state(root, 'mark', '2', 'done', '{"version":"1.0.0"}');
  // Act
  const r = state(root, 'resume');
  // Assert
  assert.equal(JSON.parse(r.stdout).resume, 3);
  assert.ok(existsSync(join(root, '.release', 'state.json')));
});

test('cli: a legacy file is migrated and removed on the next write', () => {
  // Arrange
  const root = temp();
  writeFileSync(join(root, '.release-state.json'), JSON.stringify({ version: '1.0.0', lastStep: 4 }));
  // Act
  state(root, 'mark', '5', 'done');
  // Assert
  assert.equal(JSON.parse(state(root, 'resume').stdout).resume, 6);
  assert.equal(existsSync(join(root, '.release-state.json')), false);
});

test('cli: a disallowed output key exits 1 with one stderr line', () => {
  // Arrange
  const root = temp();
  // Act
  const r = state(root, 'mark', '1', 'done', '{"token":"x"}');
  // Assert
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^cdk release-state: key not allowed: token\n$/);
});

test('cli: clear removes the state directory', () => {
  // Arrange
  const root = temp();
  state(root, 'mark', '1', 'done');
  // Act
  state(root, 'clear');
  // Assert
  assert.equal(existsSync(join(root, '.release')), false);
});

test('cli: failure-handlers escalates after the cap', () => {
  // Arrange
  const input = 'not ok 1 - boom';
  // Act
  const r = spawnSync('node', [HANDLERS, '2', 'npm', 'test'], { input, encoding: 'utf8', timeout: 15_000 });
  // Assert
  assert.equal(JSON.parse(r.stdout).action, 'escalate');
});

test('policy: SKILL.md drives the state file and failure handlers, not the legacy file', () => {
  // Arrange
  const needles = ['release-state.mjs <root> mark', 'failure-handlers.mjs <attempts> <command>', '.release/state.json'];
  // Act
  const missing = needles.filter((n) => !SKILL.includes(n));
  // Assert
  assert.deepEqual(missing, []);
  assert.doesNotMatch(SKILL, /rm \.release-state\.json/);
});

test('policy: the tag push keeps its single version question and never forces', () => {
  // Arrange
  const text = SKILL;
  // Act
  const forces = /git push[^\n]*--force/.test(text);
  // Assert
  assert.equal(forces, false);
  assert.match(text, /Never push, merge, tag, or delete a branch outside the steps below; never `--force`/);
});
