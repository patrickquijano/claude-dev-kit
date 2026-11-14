import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const unformatted = new Set(['README.md', 'CHANGELOG.md']);
const merged = /[.;:)] \d*[a-z]\. (\*\*|[A-Z`$])/;

function mergedLines(text) {
  let fenced = false;
  const hits = [];
  text.split('\n').forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
    } else if (!fenced && merged.test(line)) {
      hits.push(index + 1);
    }
  });
  return hits;
}

describe('markdown sub-steps stay separate under proseWrap never', () => {
  test('detector flags a merged sub-step line', () => {
    // Arrange
    const text = '1. **Step.** a. First. b. Second.';
    // Act
    const hits = mergedLines(text);
    // Assert
    assert.deepEqual(hits, [1]);
  });

  test('detector passes sub-steps in their own paragraphs and fenced text', () => {
    // Arrange
    const text = '1. **Step.**\n\n   a. First.\n\n   b. Second.\n\n```\nx. a. First. b. Second.\n```';
    // Act
    const hits = mergedLines(text);
    // Assert
    assert.deepEqual(hits, []);
  });

  test('no tracked markdown file has a sub-step merged mid-line', () => {
    // Arrange
    const files = execFileSync('git', ['ls-files', '*.md'], { cwd: root, encoding: 'utf8', timeout: 10000 })
      .split('\n')
      .filter((file) => file && !unformatted.has(file));
    // Act
    const found = files.flatMap((file) =>
      mergedLines(readFileSync(join(root, file), 'utf8')).map((line) => `${file}:${line}`)
    );
    // Assert
    assert.deepEqual(found, []);
  });
});
