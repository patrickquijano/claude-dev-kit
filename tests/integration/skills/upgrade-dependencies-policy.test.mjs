import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const spawnsMd = () => readFileSync(join(root, 'skills', 'upgrade-dependencies', 'references', 'spawns.md'), 'utf8');

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
});
