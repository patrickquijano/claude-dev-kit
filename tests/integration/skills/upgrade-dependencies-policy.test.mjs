import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const spawnsMd = () => readFileSync(join(root, 'skills', 'upgrade-dependencies', 'references', 'spawns.md'), 'utf8');
const briefsMd = () => readFileSync(join(root, 'skills', 'upgrade-dependencies', 'references', 'briefs.md'), 'utf8');
const devcontainerCommandsMd = () =>
  readFileSync(join(root, 'skills', 'setup-devcontainer', 'references', 'commands.md'), 'utf8');

describe('upgrade-dependencies policy', () => {
  test('passes kind checks in the check-runner brief', () => {
    // Arrange
    const text = spawnsMd();
    // Act
    const kind = /^- Check-runner \(step 9\):.* Brief: kind `checks`, root, changed paths,/m.test(text);
    const stale = /^- Check-runner \(step 9\):.* Brief: root, changed paths/m.test(text);
    // Assert
    assert.ok(kind, 'check-runner brief kind `checks` missing');
    assert.equal(stale, false);
  });

  test('passes kind dependencies in the resolver brief without a line cap', () => {
    // Arrange
    const line = spawnsMd()
      .split('\n')
      .find((l) => l.startsWith('- Version resolver (step 3)'));
    // Act
    const kind = line.includes('Brief: kind `dependencies`, the project path');
    const stale = line.includes('Brief: the project path');
    const cap = line.includes('At most 60 lines');
    // Assert
    assert.ok(kind, 'resolver brief kind `dependencies` missing');
    assert.equal(stale, false);
    assert.equal(cap, false);
  });

  test('keeps the 60-line cap off the researcher, check-runner, and leftover returns', () => {
    // Arrange
    const lines = spawnsMd()
      .split('\n')
      .filter((l) => /^- (Researcher|Check-runner|Leftover search) /.test(l));
    // Act
    const capped = lines.filter((l) => l.includes('At most 60 lines'));
    // Assert
    assert.equal(lines.length, 3);
    assert.deepEqual(capped, []);
  });

  test('words the briefs goals as type check, test, and build', () => {
    // Arrange
    const lines = briefsMd().split('\n');
    const goal = lines.find((l) => l.startsWith('Goal: '));
    const final = lines.find((l) => l.includes('one final goal'));
    const linter = lines.find((l) => l.startsWith('- Run no formatter or linter'));
    // Act
    const narrowed = [goal, final, linter].map((l) => l?.includes('type check, test, and build'));
    const stale = lines.some((l) => l.includes('every `[required]` check that passed'));
    // Assert
    assert.deepEqual(narrowed, [true, true, true]);
    assert.equal(stale, false);
  });

  test('leaves -v out of the compose-down row', () => {
    // Arrange
    const row = devcontainerCommandsMd()
      .split('\n')
      .find((l) => l.startsWith('| `compose-down` |'));
    // Act
    const hasDown = row?.includes(' down`');
    const stale = row?.includes(' down -v');
    // Assert
    assert.ok(hasDown, 'compose-down row missing or changed');
    assert.equal(stale, false);
  });
});
