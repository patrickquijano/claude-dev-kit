import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const reportTemplates = join(root, 'skills', 'audit-code-security', 'assets', 'report-templates.md');
const changelogFormat = join(root, 'skills', 'update-changelog', 'references', 'format.md');

describe('template fences keep their line breaks under proseWrap never', () => {
  for (const pattern of [/^Open: /m, /^Not hunted: /m, /^Repo root: /m, /^Edit only files inside the repo/m]) {
    test(`report-templates.md has a line matching ${pattern}`, () => {
      // Arrange
      const text = readFileSync(reportTemplates, 'utf8');
      // Act
      const found = pattern.test(text);
      // Assert
      assert.equal(found, true);
    });
  }

  test('format.md keeps the Keep a Changelog and SemVer header lines apart', () => {
    // Arrange
    const text = readFileSync(changelogFormat, 'utf8');
    // Act
    const found = /1\.1\.0\/\),\nand this project adheres to/.test(text);
    // Assert
    assert.equal(found, true);
  });
});
