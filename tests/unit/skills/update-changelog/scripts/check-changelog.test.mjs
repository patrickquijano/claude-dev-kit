import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import { checkChangelog, main } from '../../../../../skills/update-changelog/scripts/check-changelog.mjs';

const REPO = 'https://github.com/o/r';
const GOOD = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add a thing.

## [1.1.0] - 2026-02-01

### Added

- Add b.

### Fixed

- Fix c.

## [1.0.0] - 2026-01-01

### Added

- Add a.

[unreleased]: ${REPO}/compare/v1.1.0...HEAD
[1.1.0]: ${REPO}/compare/v1.0.0...v1.1.0
[1.0.0]: ${REPO}/releases/tag/v1.0.0
`;
const codes = (text) => checkChangelog(text).map((f) => f.code);

describe('checkChangelog', () => {
  test('accepts a conforming file', () => {
    // Arrange
    const text = GOOD;
    // Act
    const result = checkChangelog(text);
    // Assert
    assert.deepEqual(result, []);
  });

  test('accepts an Unreleased-only file with a period-ended Keep a Changelog line', () => {
    // Arrange
    const text = `${GOOD.split('## [1.1.0]')[0].replace(
      '/en/1.1.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
      '/en/1.1.0/).'
    )}[unreleased]: ${REPO}/compare/HEAD...HEAD\n`;
    // Act
    const result = checkChangelog(text);
    // Assert
    assert.deepEqual(result, []);
  });

  test('flags a missing SemVer line in a SemVer project', () => {
    // Arrange
    const text = GOOD.replace(
      '\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
      ''
    );
    // Act
    const result = codes(text);
    // Assert
    assert.ok(result.includes('header'));
  });

  test('flags versions out of descending order', () => {
    // Arrange
    const text = GOOD.replace('## [1.1.0] - 2026-02-01', '## [0.9.0] - 2026-02-01').replace('[1.1.0]:', '[0.9.0]:');
    // Act
    const result = codes(text);
    // Assert
    assert.ok(result.includes('version-order'));
  });

  test('flags sections out of canonical order', () => {
    // Arrange
    const text = GOOD.replace(
      '### Added\n\n- Add b.\n\n### Fixed\n\n- Fix c.',
      '### Fixed\n\n- Fix c.\n\n### Added\n\n- Add b.'
    );
    // Act
    const result = codes(text);
    // Assert
    assert.ok(result.includes('section-order'));
  });

  test('flags a heading without a date', () => {
    // Arrange
    const text = GOOD.replace('## [1.0.0] - 2026-01-01', '## [1.0.0]');
    // Act
    const result = codes(text);
    // Assert
    assert.ok(result.includes('heading-date'));
  });

  test('flags a missing link definition', () => {
    // Arrange
    const text = GOOD.replace(`[1.0.0]: ${REPO}/releases/tag/v1.0.0\n`, '');
    // Act
    const result = codes(text);
    // Assert
    assert.ok(result.includes('link-missing'));
  });

  test('flags an unused link definition', () => {
    // Arrange
    const text = `${GOOD}[0.5.0]: ${REPO}/releases/tag/v0.5.0\n`;
    // Act
    const result = codes(text);
    // Assert
    assert.ok(result.includes('link-unused'));
  });

  test('flags link definitions that are not newest first', () => {
    // Arrange
    const text = GOOD.replace(
      `[1.1.0]: ${REPO}/compare/v1.0.0...v1.1.0\n[1.0.0]: ${REPO}/releases/tag/v1.0.0\n`,
      `[1.0.0]: ${REPO}/releases/tag/v1.0.0\n[1.1.0]: ${REPO}/compare/v1.0.0...v1.1.0\n`
    );
    // Act
    const result = codes(text);
    // Assert
    assert.ok(result.includes('link-order'));
  });

  test('flags a bold marker, a missing period, a star bullet, and a missing final newline', () => {
    // Arrange
    const text = GOOD.replace('- Add a thing.', '* **Breaking:** Add a thing').trimEnd();
    // Act
    const result = codes(text);
    // Assert
    assert.deepEqual(
      ['bold-marker', 'entry-period', 'bullet-style', 'file-end'].filter((c) => !result.includes(c)),
      []
    );
  });

  test('flags a lowercase-mismatched Unreleased heading', () => {
    // Arrange
    const text = GOOD.replace('## [Unreleased]', '## [unreleased]');
    // Act
    const result = codes(text);
    // Assert
    assert.ok(result.includes('unreleased-heading'));
  });
});

describe('main', () => {
  const FILE = path.resolve('CHANGELOG.md');
  const run = (argv, { exists = true, text = GOOD } = {}) => {
    const logs = [];
    const errors = [];
    const code = main(argv, {
      existsSync: () => exists,
      readFileSync: () => text,
      log: (t) => logs.push(t),
      error: (t) => errors.push(t)
    });
    return { code, logs, errors };
  };

  test('exits 0 with ok true for a conforming file', () => {
    // Arrange
    const argv = ['check'];
    // Act
    const { code, logs } = run(argv);
    // Assert
    assert.deepEqual([code, JSON.parse(logs[0]).ok], [0, true]);
  });

  test('reads the path given by --changelog', () => {
    // Arrange
    const argv = ['check', '--changelog', 'CHANGELOG.md'];
    const seen = [];
    // Act
    const code = main(argv, {
      existsSync: (p) => seen.push(p) > 0,
      readFileSync: () => GOOD,
      log: () => {}
    });
    // Assert
    assert.deepEqual([code, seen[0]], [0, FILE]);
  });

  test('exits 1 with findings for a bad file', () => {
    // Arrange
    const argv = ['check'];
    // Act
    const { code, logs } = run(argv, { text: GOOD.replace('## [1.0.0] - 2026-01-01', '## [1.0.0]') });
    // Assert
    assert.deepEqual([code, JSON.parse(logs[0]).ok], [1, false]);
  });

  test('exits 1 when the file is missing', () => {
    // Arrange
    const argv = ['check'];
    // Act
    const { code, logs } = run(argv, { exists: false });
    // Assert
    assert.deepEqual([code, JSON.parse(logs[0]).findings[0].code], [1, 'no-changelog']);
  });

  test('prints usage and exits 2 for an unknown command', () => {
    // Arrange
    const argv = ['nope'];
    // Act
    const { code, errors } = run(argv);
    // Assert
    assert.deepEqual([code, errors.length], [2, 1]);
  });
});
