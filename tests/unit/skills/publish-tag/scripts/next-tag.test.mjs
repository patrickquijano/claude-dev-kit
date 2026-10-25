import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { detectPrefix, firstRelease, main, nextTag } from '../../../../../skills/publish-tag/scripts/next-tag.mjs';

const CL = (head) => `# Changelog\n\n## [Unreleased]\n\n- next\n\n${head}\n\n- a\n`;

describe('firstRelease', () => {
  test('skips Unreleased and returns the first release heading', () => {
    // Arrange
    const text = CL('## [1.2.0] - 2026-01-02\n\n## [1.1.0] - 2026-01-01');
    // Act
    const result = firstRelease(text);
    // Assert
    assert.equal(result.label, '1.2.0');
  });

  test('keeps the text after the brackets', () => {
    // Arrange
    const text = CL('## [1.2.0] - 2026-01-02 [YANKED]');
    // Act
    const result = firstRelease(text);
    // Assert
    assert.equal(result.rest, '- 2026-01-02 [YANKED]');
  });

  test('returns null when only Unreleased exists', () => {
    // Arrange
    const text = '## [Unreleased]\n\n- x\n';
    // Act
    const result = firstRelease(text);
    // Assert
    assert.equal(result, null);
  });

  test('ignores a heading inside a code fence', () => {
    // Arrange
    const text = '```md\n## [9.9.9] - 2026-01-01\n```\n';
    // Act
    const result = firstRelease(text);
    // Assert
    assert.equal(result, null);
  });
});

describe('detectPrefix', () => {
  test('v when every tag has the v form', () => {
    // Arrange
    const tags = ['v1.0.0', 'v1.1.0', ''];
    // Act
    const result = detectPrefix(tags);
    // Assert
    assert.equal(result, 'v');
  });

  test('none when every tag is bare', () => {
    // Arrange
    const tags = ['1.0.0', '1.1.0'];
    // Act
    const result = detectPrefix(tags);
    // Assert
    assert.equal(result, 'none');
  });

  test('null without tags', () => {
    // Arrange
    const tags = [''];
    // Act
    const result = detectPrefix(tags);
    // Assert
    assert.equal(result, null);
  });

  test('null for both forms', () => {
    // Arrange
    const tags = ['v1.0.0', '1.1.0'];
    // Act
    const result = detectPrefix(tags);
    // Assert
    assert.equal(result, null);
  });
});

describe('nextTag', () => {
  test('builds a v tag from detected tags', () => {
    // Arrange
    const input = { changelog: CL('## [1.2.0] - 2026-01-02'), tags: ['v1.1.0'] };
    // Act
    const result = nextTag(input);
    // Assert
    assert.deepEqual(result, { ok: true, version: '1.2.0', prefix: 'v', prefixSource: 'tags', tag: 'v1.2.0' });
  });

  test('the flag wins and none gives a bare tag', () => {
    // Arrange
    const input = { changelog: CL('## [1.2.0]'), tags: ['v1.1.0'], prefix: 'none' };
    // Act
    const result = nextTag(input);
    // Assert
    assert.deepEqual([result.tag, result.prefixSource], ['1.2.0', 'flag']);
  });

  test('stops on a missing release', () => {
    // Arrange
    const input = { changelog: '## [Unreleased]\n', tags: [] };
    // Act
    const result = nextTag(input);
    // Assert
    assert.equal(result.code, 'no-released-version');
  });

  test('stops on a yanked, pre-release, invalid, or badly dated heading', () => {
    // Arrange
    const heads = [
      '## [1.0.0] - 2026-01-01 [YANKED]',
      '## [1.0.0-rc.1] - 2026-01-01',
      '## [1.0] - 2026-01-01',
      '## [1.0.0] - 2026-02-30'
    ];
    // Act
    const codes = heads.map((h) => nextTag({ changelog: CL(h), prefix: 'v' }).code);
    // Assert
    assert.deepEqual(codes, ['bad-heading', 'bad-heading', 'bad-heading', 'bad-heading']);
  });

  test('stops when the prefix is unclear or invalid', () => {
    // Arrange
    const changelog = CL('## [1.0.0] - 2026-01-01');
    // Act
    const codes = [nextTag({ changelog, tags: [] }).code, nextTag({ changelog, prefix: 'x' }).code];
    // Assert
    assert.deepEqual(codes, ['prefix-unknown', 'bad-prefix']);
  });
});

describe('main', () => {
  const run = (argv, deps) => {
    const out = [];
    const code = main(argv, {
      changelog: () => CL('## [2.0.0] - 2026-03-01'),
      tags: () => ['v1.0.0'],
      log: (t) => out.push(t),
      ...deps
    });
    return { code, out: JSON.parse(out[0]) };
  };

  test('prints the tag and exits 0', () => {
    // Arrange
    const argv = [];
    // Act
    const { code, out } = run(argv, {});
    // Assert
    assert.deepEqual([code, out.tag], [0, 'v2.0.0']);
  });

  test('passes --prefix through', () => {
    // Arrange
    const argv = ['--prefix', 'none'];
    // Act
    const { out } = run(argv, {});
    // Assert
    assert.equal(out.tag, '2.0.0');
  });

  test('exits 1 when the changelog is not committed', () => {
    // Arrange
    const argv = [];
    // Act
    const { code, out } = run(argv, { changelog: () => null });
    // Assert
    assert.deepEqual([code, out.code], [1, 'changelog-missing']);
  });

  test('exits 1 on a stop code', () => {
    // Arrange
    const argv = [];
    // Act
    const { code, out } = run(argv, { tags: () => [] });
    // Assert
    assert.deepEqual([code, out.code], [1, 'prefix-unknown']);
  });

  test('reads the changelog at --ref', () => {
    // Arrange
    const argv = ['--ref', 'origin/main'];
    const seen = [];
    // Act
    run(argv, { changelog: (ref) => (seen.push(ref), CL('## [2.0.0]')) });
    // Assert
    assert.deepEqual(seen, ['origin/main']);
  });

  test('exits 1 for an unsafe --ref', () => {
    // Arrange
    const argv = ['--ref', '--output=x'];
    // Act
    const { code, out } = run(argv, {});
    // Assert
    assert.deepEqual([code, out.code], [1, 'bad-ref']);
  });
});
