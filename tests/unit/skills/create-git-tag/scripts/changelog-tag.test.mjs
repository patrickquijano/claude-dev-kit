import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildMessage, findRelease, main } from '../../../../../skills/create-git-tag/scripts/changelog-tag.mjs';

const CHANGELOG = [
  '# Changelog',
  '',
  '## [Unreleased]',
  '',
  '### Added',
  '- pending',
  '',
  '## [1.2.0] - 2026-03-01',
  '',
  '### Added',
  '- thing',
  '',
  '### Fixed',
  '- bug',
  '',
  '## [1.1.0] - 2026-02-01',
  '- old',
  '',
  '[1.2.0]: https://example.com/1.2.0',
  '[1.1.0]: https://example.com/1.1.0',
  ''
].join('\n');

describe('findRelease', () => {
  test('returns the newest dated version with ### lines kept', () => {
    // Arrange
    const text = CHANGELOG;
    // Act
    const result = findRelease(text);
    // Assert
    assert.deepEqual(
      [result.version, result.date, result.body],
      ['1.2.0', '2026-03-01', '### Added\n- thing\n\n### Fixed\n- bug']
    );
  });

  test('matches a bracketless heading and trims trailing link references', () => {
    // Arrange
    const text = '## 0.3.0-rc.1 - 2026-01-02\n- a\n\n[0.3.0-rc.1]: https://example.com\n';
    // Act
    const result = findRelease(text);
    // Assert
    assert.deepEqual([result.version, result.body], ['0.3.0-rc.1', '- a']);
  });

  test('stops with no-dated-version when only Unreleased exists', () => {
    // Arrange
    const text = '# Changelog\n\n## [Unreleased]\n- x\n';
    // Act
    const result = findRelease(text);
    // Assert
    assert.deepEqual([result.ok, result.code], [false, 'no-dated-version']);
  });

  test('skips an undated or non-SemVer heading', () => {
    // Arrange
    const text = '## [1.0.0]\n- a\n\n## [1.0] - 2026-01-01\n- b\n';
    // Act
    const result = findRelease(text);
    // Assert
    assert.equal(result.ok, false);
  });

  test('matches a yanked heading as the newest version', () => {
    // Arrange
    const text = '## [1.3.0] - 2026-04-01 [YANKED]\n- bad\n\n## [1.2.0] - 2026-03-01\n- ok\n';
    // Act
    const result = findRelease(text);
    // Assert
    assert.deepEqual([result.version, result.date], ['1.3.0', '2026-04-01']);
  });

  test('stops on a non-string input', () => {
    // Arrange
    const text = undefined;
    // Act
    const result = findRelease(text);
    // Assert
    assert.equal(result.code, 'no-dated-version');
  });
});

describe('buildMessage', () => {
  test('joins the title and body with a blank line', () => {
    // Arrange
    const [version, body] = ['1.0.0', '### Added\n- a'];
    // Act
    const result = buildMessage(version, body);
    // Assert
    assert.equal(result, 'Release 1.0.0\n\n### Added\n- a');
  });

  test('is the title alone for an empty body', () => {
    // Arrange
    const [version, body] = ['1.0.0', ''];
    // Act
    const result = buildMessage(version, body);
    // Assert
    assert.equal(result, 'Release 1.0.0');
  });

  test('does not end with a blank line', () => {
    // Arrange
    const [version, body] = ['2.0.0', '- a'];
    // Act
    const result = buildMessage(version, body);
    // Assert
    assert.ok(!result.endsWith('\n'));
  });
});

describe('main', () => {
  const run = (argv, readFile) => {
    const out = { logs: [], errors: [] };
    const code = main(argv, {
      readFile,
      log: (t) => out.logs.push(t),
      error: (t) => out.errors.push(t)
    });
    return { code, out };
  };

  test('prints the release JSON and exits 0', () => {
    // Arrange
    const argv = ['CHANGELOG.md'];
    // Act
    const { code, out } = run(argv, () => CHANGELOG);
    // Assert
    const json = JSON.parse(out.logs[0]);
    assert.deepEqual([code, json.version, json.tag], [0, '1.2.0', 'v1.2.0']);
  });

  test('prints the raw message with --message', () => {
    // Arrange
    const argv = ['--message', 'CHANGELOG.md'];
    // Act
    const { code, out } = run(argv, () => CHANGELOG);
    // Assert
    assert.deepEqual([code, out.logs[0].startsWith('Release 1.2.0\n\n### Added')], [0, true]);
  });

  test('exits 1 with no-changelog on ENOENT', () => {
    // Arrange
    const readFile = () => {
      throw Object.assign(new Error('nope'), { code: 'ENOENT' });
    };
    // Act
    const { code, out } = run(['CHANGELOG.md'], readFile);
    // Assert
    assert.deepEqual([code, JSON.parse(out.logs[0]).code], [1, 'no-changelog']);
  });

  test('exits 1 with no-dated-version', () => {
    // Arrange
    const readFile = () => '## [Unreleased]\n';
    // Act
    const { code, out } = run(['CHANGELOG.md'], readFile);
    // Assert
    assert.deepEqual([code, JSON.parse(out.logs[0]).code], [1, 'no-dated-version']);
  });

  test('exits 2 with usage on no file argument', () => {
    // Arrange
    const argv = ['--message'];
    // Act
    const { code, out } = run(argv, () => '');
    // Assert
    assert.deepEqual([code, out.errors.length], [2, 1]);
  });

  test('rethrows a read error that is not ENOENT', () => {
    // Arrange
    const readFile = () => {
      throw Object.assign(new Error('denied'), { code: 'EACCES' });
    };
    // Act + Assert
    assert.throws(() => run(['CHANGELOG.md'], readFile), /denied/);
  });
});
