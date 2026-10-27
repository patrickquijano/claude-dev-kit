import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  listVersions,
  main,
  merge,
  section
} from '../../../../../skills/create-github-release/scripts/release-notes.mjs';

const CL = `# Changelog

## [Unreleased]

## [0.6.0] - 2026-10-27

### Added

- new thing

\`\`\`md
## [9.9.9] - 2026-01-01
\`\`\`

### Removed

- old thing

## [0.5.0] - 2026-10-01

### Fixed

- a bug

[0.6.0]: https://example.com/0.6.0
[0.5.0]: https://example.com/0.5.0
`;

describe('listVersions', () => {
  test('lists released versions and skips Unreleased and fenced headings', () => {
    // Arrange
    const text = CL;
    // Act
    const result = listVersions(text);
    // Assert
    assert.deepEqual(result, ['0.6.0', '0.5.0']);
  });

  test('returns an empty list when only Unreleased exists', () => {
    // Arrange
    const text = '## [Unreleased]\n\n- x\n';
    // Act
    const result = listVersions(text);
    // Assert
    assert.deepEqual(result, []);
  });
});

describe('section', () => {
  test('returns the body without the heading, keeping the fenced heading', () => {
    // Arrange
    const version = '0.6.0';
    // Act
    const result = section(CL, version);
    // Assert
    assert.deepEqual(
      [
        result.ok,
        result.notes.startsWith('### Added'),
        result.notes.includes('## [9.9.9]'),
        result.notes.endsWith('- old thing')
      ],
      [true, true, true, true]
    );
  });

  test('strips trailing link definitions from the last section and accepts a v prefix', () => {
    // Arrange
    const version = 'v0.5.0';
    // Act
    const result = section(CL, version);
    // Assert
    assert.equal(result.notes, '### Fixed\n\n- a bug');
  });

  test('reports a missing section', () => {
    // Arrange
    const version = '1.0.0';
    // Act
    const result = section(CL, version);
    // Assert
    assert.deepEqual(result, { ok: false, code: 'no-section' });
  });

  test('reports Unreleased, an empty section, and an empty version', () => {
    // Arrange
    const text = '## [Unreleased]\n\n## [1.0.0] - 2026-01-01\n\n## [0.9.0]\n- x\n';
    // Act
    const result = [section(text, 'Unreleased'), section(text, '1.0.0'), section(text, '')].map((r) => r.code);
    // Assert
    assert.deepEqual(result, ['unreleased', 'empty-section', 'no-version']);
  });
});

describe('merge', () => {
  test('appends the marked block when the body has no changelog block', () => {
    // Arrange
    const body = 'Intro text.';
    // Act
    const result = merge(body, '### Added\n\n- x');
    // Assert
    assert.deepEqual(
      [result.replaced, result.merged],
      [false, 'Intro text.\n\n<!-- changelog:start -->\n### Added\n\n- x\n<!-- changelog:end -->\n']
    );
  });

  test('replaces the generated Keep a Changelog run and keeps text around it', () => {
    // Arrange
    const body = 'Intro.\n\n### Added\n\n- old\n\n### Fixed\n\n- older\n\n## Footer\n\nBye.\n';
    // Act
    const result = merge(body, '### Added\n\n- new');
    // Assert
    assert.deepEqual(
      [
        result.replaced,
        result.merged.includes('- old'),
        result.merged.startsWith('Intro.'),
        result.merged.endsWith('Bye.\n')
      ],
      [true, false, true, true]
    );
  });

  test('replaces the content between markers and moves a foreign section after the block', () => {
    // Arrange
    const body =
      'A\n<!-- changelog:start -->\n### Added\n\n- old\n\n### Contributors\n\n- @someone\n<!-- changelog:end -->\nB\n';
    // Act
    const result = merge(body, '### Added\n\n- new');
    // Assert
    assert.deepEqual(
      [result.kept, result.merged],
      [
        ['### Contributors\n\n- @someone'],
        'A\n\n<!-- changelog:start -->\n### Added\n\n- new\n<!-- changelog:end -->\n\n### Contributors\n\n- @someone\n\nB\n'
      ]
    );
  });

  test('keeps a prose line inside the block unless the notes already hold it', () => {
    // Arrange
    const body = '### Added\n\n- old\n\n**Full Changelog**: https://x/y\n';
    // Act
    const [keeps, drops] = [merge(body, '### Added\n\n- new'), merge(body, '**Full Changelog**: https://x/y\n\n- new')];
    // Assert
    assert.deepEqual([keeps.kept, drops.kept], [['**Full Changelog**: https://x/y'], []]);
  });

  test('is stable: merging the same notes twice changes nothing', () => {
    // Arrange
    const once = merge('Intro.', '### Added\n\n- x').merged;
    // Act
    const twice = merge(once, '### Added\n\n- x').merged;
    // Assert
    assert.equal(twice, once);
  });

  test('reports unpaired markers', () => {
    // Arrange
    const body = '<!-- changelog:end -->\n<!-- changelog:start -->\n';
    // Act
    const result = merge(body, '- x');
    // Assert
    assert.deepEqual(result, { ok: false, code: 'bad-markers' });
  });
});

describe('main', () => {
  const run = (argv, files) => {
    const out = { logs: [], errors: [] };
    const code = main(argv, {
      readFile: (f) => {
        if (!(f in files)) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
        return files[f];
      },
      log: (t) => out.logs.push(t),
      error: (t) => out.errors.push(t)
    });
    return { code, out };
  };

  test('versions prints the list', () => {
    // Arrange
    const argv = ['versions', '--changelog', 'c.md'];
    // Act
    const { code, out } = run(argv, { 'c.md': CL });
    // Assert
    assert.deepEqual([code, JSON.parse(out.logs[0]).versions], [0, ['0.6.0', '0.5.0']]);
  });

  test('section exits 1 for a missing section', () => {
    // Arrange
    const argv = ['section', '--version', '2.0.0', '--changelog', 'c.md'];
    // Act
    const { code, out } = run(argv, { 'c.md': CL });
    // Assert
    assert.deepEqual([code, JSON.parse(out.logs[0]).code], [1, 'no-section']);
  });

  test('merge prints the merged body', () => {
    // Arrange
    const argv = ['merge', '--body', 'b.md', '--notes', 'n.md'];
    // Act
    const { code, out } = run(argv, { 'b.md': 'Hi', 'n.md': '- x' });
    // Assert
    assert.deepEqual([code, JSON.parse(out.logs[0]).replaced], [0, false]);
  });

  test('exits 1 with no-changelog when the file is missing', () => {
    // Arrange
    const argv = ['versions', '--changelog', 'gone.md'];
    // Act
    const { code, out } = run(argv, {});
    // Assert
    assert.deepEqual([code, JSON.parse(out.logs[0]).code], [1, 'no-changelog']);
  });

  test('exits 2 with usage on an unknown command or a missing flag', () => {
    // Arrange
    const argvs = [['nope'], ['section', '--changelog', 'c.md']];
    // Act
    const codes = argvs.map((a) => run(a, { 'c.md': CL }).code);
    // Assert
    assert.deepEqual(codes, [2, 2]);
  });
});
