import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import {
  isSemver,
  main,
  notes,
  parseChangelog
} from '../../../../../skills/publish-github-release/scripts/changelog-notes.mjs';

const REPO = 'https://github.com/o/r';
const CL = `# Changelog

## [Unreleased]

### Added

- next

## [1.1.0-rc.1] - 2026-02-01

### Fixed

- c

## [1.0.0] - 2026-01-01

### Added

- a

[Unreleased]: ${REPO}/compare/v1.0.0...HEAD
[1.0.0]: ${REPO}/releases/tag/v1.0.0
`;
const TMP = path.resolve('/stub-tmp');
const codes = (r) => r.errors.map((e) => e.code);

describe('isSemver', () => {
  test('accepts a plain version', () => {
    // Arrange
    const version = '1.2.3';
    // Act
    const result = isSemver(version);
    // Assert
    assert.equal(result, true);
  });

  test('accepts a pre-release with build metadata', () => {
    // Arrange
    const version = '1.2.3-rc.1+build.5';
    // Act
    const result = isSemver(version);
    // Assert
    assert.equal(result, true);
  });

  test('rejects a v prefix', () => {
    // Arrange
    const version = 'v1.2.3';
    // Act
    const result = isSemver(version);
    // Assert
    assert.equal(result, false);
  });

  test('rejects a missing value', () => {
    // Arrange
    const version = undefined;
    // Act
    const result = isSemver(version);
    // Assert
    assert.equal(result, false);
  });
});

describe('parseChangelog', () => {
  test('splits sections in order', () => {
    // Arrange
    const text = CL;
    // Act
    const { sections } = parseChangelog(text);
    // Assert
    assert.deepEqual(
      sections.map((s) => s.label),
      ['Unreleased', '1.1.0-rc.1', '1.0.0']
    );
  });

  test('ignores a heading inside a code fence', () => {
    // Arrange
    const text = '## [1.0.0] - 2026-01-01\n```\n## [9.9.9]\n```\n';
    // Act
    const { sections } = parseChangelog(text);
    // Assert
    assert.equal(sections.length, 1);
  });

  test('drops link references from section bodies', () => {
    // Arrange
    const text = CL;
    // Act
    const { sections } = parseChangelog(text);
    // Assert
    assert.doesNotMatch(sections[2].body, /releases\/tag/);
  });

  test('flags an unterminated fence', () => {
    // Arrange
    const text = '## [1.0.0] - 2026-01-01\n```\nx\n';
    // Act
    const { unterminated } = parseChangelog(text);
    // Assert
    assert.equal(unterminated, true);
  });
});

describe('notes', () => {
  test('latest picks the first released section and flags a pre-release', () => {
    // Arrange
    const changelog = CL;
    // Act
    const result = notes({ changelog });
    // Assert
    assert.deepEqual([result.version, result.prerelease, result.notes], ['1.1.0-rc.1', true, '### Fixed\n\n- c\n']);
  });

  test('an exact version picks that section', () => {
    // Arrange
    const changelog = CL;
    // Act
    const result = notes({ changelog, version: '1.0.0' });
    // Assert
    assert.deepEqual([result.ok, result.prerelease, result.date], [true, false, '2026-01-01']);
  });

  test('reports an unknown version', () => {
    // Arrange
    const changelog = CL;
    // Act
    const result = notes({ changelog, version: '2.0.0' });
    // Assert
    assert.deepEqual(codes(result), ['version-not-found']);
  });

  test('reports a changelog with only Unreleased', () => {
    // Arrange
    const changelog = '## [Unreleased]\n\n- x\n';
    // Act
    const result = notes({ changelog });
    // Assert
    assert.deepEqual(codes(result), ['no-release']);
  });

  test('reports an invalid date', () => {
    // Arrange
    const changelog = '## [1.0.0] - 2026-13-40\n\n- x\n';
    // Act
    const result = notes({ changelog });
    // Assert
    assert.deepEqual(codes(result), ['invalid-date']);
  });

  test('reports a yanked version', () => {
    // Arrange
    const changelog = '## [1.0.0] - 2026-01-01 [YANKED]\n\n- x\n';
    // Act
    const result = notes({ changelog });
    // Assert
    assert.deepEqual(codes(result), ['yanked']);
  });

  test('reports empty notes', () => {
    // Arrange
    const changelog = '## [1.0.0] - 2026-01-01\n';
    // Act
    const result = notes({ changelog });
    // Assert
    assert.deepEqual(codes(result), ['empty-notes']);
  });

  test('reports an unterminated fence', () => {
    // Arrange
    const changelog = '## [1.0.0] - 2026-01-01\n```\nx\n';
    // Act
    const result = notes({ changelog });
    // Assert
    assert.deepEqual(codes(result), ['unterminated-fence']);
  });
});

describe('main', () => {
  const stubs = (over = {}) => {
    const out = { logs: [], errors: [], files: {} };
    const deps = {
      existsSync: () => true,
      readFileSync: () => CL,
      mkdirSync: () => {},
      writeFileSync: (file, text) => (out.files[file] = text),
      log: (t) => out.logs.push(t),
      error: (t) => out.errors.push(t),
      tmpdir: () => TMP,
      realpathSync: (p) => p,
      env: {},
      ...over
    };
    return { out, deps };
  };

  test('writes the notes file and exits 0', () => {
    // Arrange
    const { out, deps } = stubs();
    const target = path.join(TMP, 'scratch', 'notes.md');
    // Act
    const code = main(['notes', '--version', '1.0.0', '--notes-out', target], deps);
    // Assert
    assert.deepEqual([code, out.files[target]], [0, '### Added\n\n- a\n']);
  });

  test('writes under the real path of the temp directory', () => {
    // Arrange
    const { out, deps } = stubs({ realpathSync: () => path.resolve('/private/stub-tmp') });
    const target = path.resolve('/private/stub-tmp/notes.md');
    // Act
    const code = main(['notes', '--version', '1.0.0', '--notes-out', target], deps);
    // Assert
    assert.deepEqual([code, out.files[target]], [0, '### Added\n\n- a\n']);
  });

  test('writes under CLAUDE_JOB_DIR', () => {
    // Arrange
    const job = path.resolve('/stub-job');
    const { out, deps } = stubs({ env: { CLAUDE_JOB_DIR: job } });
    const target = path.join(job, 'notes.md');
    // Act
    const code = main(['notes', '--version', '1.0.0', '--notes-out', target], deps);
    // Assert
    assert.deepEqual([code, out.files[target]], [0, '### Added\n\n- a\n']);
  });

  test('rejects a notes file outside the allowed roots and writes nothing', () => {
    // Arrange
    const { out, deps } = stubs();
    const target = path.resolve('/elsewhere/notes.md');
    // Act
    const code = main(['notes', '--version', '1.0.0', '--notes-out', target], deps);
    // Assert
    assert.deepEqual([code, JSON.parse(out.logs[0]).errors[0].code, out.files], [1, 'notes-out-outside-scratch', {}]);
  });

  test('rejects a path that escapes the temp directory with ..', () => {
    // Arrange
    const { out, deps } = stubs();
    const target = path.join(TMP, '..', 'x', 'notes.md');
    // Act
    const code = main(['notes', '--version', '1.0.0', '--notes-out', target], deps);
    // Assert
    assert.deepEqual([code, JSON.parse(out.logs[0]).errors[0].code, out.files], [1, 'notes-out-outside-scratch', {}]);
  });

  test('rejects the temp directory itself and a sibling with the same prefix', () => {
    // Arrange
    const { out, deps } = stubs();
    // Act
    const codes = [TMP, `${TMP}-evil/notes.md`].map((t) =>
      main(['notes', '--version', '1.0.0', '--notes-out', t], deps)
    );
    // Assert
    assert.deepEqual([codes, out.files], [[1, 1], {}]);
  });

  test('prints the plan JSON without writing when no output file is given', () => {
    // Arrange
    const { out, deps } = stubs();
    // Act
    const code = main(['notes'], deps);
    // Assert
    assert.deepEqual([code, JSON.parse(out.logs[0]).version, out.files], [0, '1.1.0-rc.1', {}]);
  });

  test('exits 1 with no-changelog when the file is missing', () => {
    // Arrange
    const { out, deps } = stubs({ existsSync: () => false });
    // Act
    const code = main(['notes'], deps);
    // Assert
    assert.deepEqual([code, JSON.parse(out.logs[0]).errors[0].code], [1, 'no-changelog']);
  });

  test('exits 2 on an unknown subcommand', () => {
    // Arrange
    const { out, deps } = stubs();
    // Act
    const code = main(['nope'], deps);
    // Assert
    assert.equal(code, 2);
    assert.match(out.errors[0], /usage/);
  });
});
