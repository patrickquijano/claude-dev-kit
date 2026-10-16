import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import {
  cmpSemver,
  detectPrefix,
  isSemver,
  main,
  parseChangelog,
  plan
} from '../../../../../skills/create-github-release/scripts/changelog-release.mjs';

const REPO = 'https://github.com/o/r';
const CL = `# Changelog

## [Unreleased]

### Added

- next

## [1.1.0] - 2026-02-01

### Added

- b

### Fixed

- c

## [1.0.0] - 2026-01-01

### Added

- a

[Unreleased]: ${REPO}/compare/v1.1.0...HEAD
[1.1.0]: ${REPO}/compare/v1.0.0...v1.1.0
[1.0.0]: ${REPO}/releases/tag/v1.0.0
`;
const codes = (r) => r.errors.map((e) => e.code);
const sec = (heading, body = '- x') => `## [Unreleased]\n\n${heading}\n\n${body}\n`;

describe('isSemver', () => {
  test('accepts a plain version', () => {
    // Arrange
    const version = '1.0.0';
    // Act
    const result = isSemver(version);
    // Assert
    assert.equal(result, true);
  });

  test('accepts a pre-release with build metadata', () => {
    // Arrange
    const version = '1.0.0-rc.1+build.5';
    // Act
    const result = isSemver(version);
    // Assert
    assert.equal(result, true);
  });

  test('rejects a two-part version', () => {
    // Arrange
    const version = '1.0';
    // Act
    const result = isSemver(version);
    // Assert
    assert.equal(result, false);
  });

  test('rejects a leading zero and a v prefix', () => {
    // Arrange
    const versions = ['01.0.0', 'v1.0.0'];
    // Act
    const results = versions.map(isSemver);
    // Assert
    assert.deepEqual(results, [false, false]);
  });

  test('rejects undefined', () => {
    // Arrange
    const version = undefined;
    // Act
    const result = isSemver(version);
    // Assert
    assert.equal(result, false);
  });
});

describe('cmpSemver', () => {
  test('ranks a release above its pre-release', () => {
    // Arrange
    const [a, b] = ['1.0.0', '1.0.0-rc.1'];
    // Act
    const result = cmpSemver(a, b);
    // Assert
    assert.ok(result > 0);
  });

  test('compares numeric pre-release identifiers as numbers', () => {
    // Arrange
    const [a, b] = ['1.0.0-alpha.2', '1.0.0-alpha.10'];
    // Act
    const result = cmpSemver(a, b);
    // Assert
    assert.ok(result < 0);
  });

  test('ranks a shorter pre-release below a longer one with the same prefix', () => {
    // Arrange
    const [a, b] = ['1.0.0-alpha', '1.0.0-alpha.1'];
    // Act
    const result = cmpSemver(a, b);
    // Assert
    assert.ok(result < 0);
  });

  test('ignores build metadata', () => {
    // Arrange
    const [a, b] = ['1.0.0+a', '1.0.0+b'];
    // Act
    const result = cmpSemver(a, b);
    // Assert
    assert.equal(result, 0);
  });

  test('ranks a lower minor below a higher one', () => {
    // Arrange
    const [a, b] = ['1.1.0', '1.2.0'];
    // Act
    const result = cmpSemver(a, b);
    // Assert
    assert.ok(result < 0);
  });
});

describe('parseChangelog', () => {
  test('splits sections and collects link references', () => {
    // Arrange
    const text = '## [1.0.0] - 2026-01-01\n\n- a\n\n[1.0.0]: http://x/v1.0.0\n';
    // Act
    const { sections, refs } = parseChangelog(text);
    // Assert
    assert.deepEqual(
      sections.map((s) => s.label),
      ['1.0.0']
    );
    assert.equal(refs['1.0.0'], 'http://x/v1.0.0');
  });

  test('keeps link references out of the section body', () => {
    // Arrange
    const text = '## [1.0.0] - 2026-01-01\n\n- a\n\n[1.0.0]: http://x/v1.0.0\n';
    // Act
    const { sections } = parseChangelog(text);
    // Assert
    assert.equal(sections[0].body, '- a');
  });

  test('ignores headings inside a code fence', () => {
    // Arrange
    const text = '## [1.0.0] - 2026-01-01\n\n```\n## [9.9.9] - 2026-01-02\n```\n';
    // Act
    const { sections } = parseChangelog(text);
    // Assert
    assert.deepEqual(
      sections.map((s) => s.label),
      ['1.0.0']
    );
  });

  test('keeps a four-backtick fence open past an inner three-backtick fence', () => {
    // Arrange
    const text = '## [1.0.0] - 2026-01-01\n\n````\n```\n## [9.9.9] - 2026-01-02\n```\n````\n';
    // Act
    const { sections } = parseChangelog(text);
    // Assert
    assert.deepEqual(
      sections.map((s) => s.label),
      ['1.0.0']
    );
  });

  test('keeps a tilde fence open past a backtick fence', () => {
    // Arrange
    const text = '## [1.0.0] - 2026-01-01\n\n~~~\n```\n## [9.9.9] - 2026-01-02\n~~~\n';
    // Act
    const { sections } = parseChangelog(text);
    // Assert
    assert.deepEqual(
      sections.map((s) => s.label),
      ['1.0.0']
    );
  });

  test('does not open a fence for inline backticks', () => {
    // Arrange
    const text = '## [1.0.0] - 2026-01-01\n\n```x``` inline\n\n## [0.9.0] - 2025-12-01\n';
    // Act
    const { sections } = parseChangelog(text);
    // Assert
    assert.deepEqual(
      sections.map((s) => s.label),
      ['1.0.0', '0.9.0']
    );
  });

  test('flags a fence that is never closed', () => {
    // Arrange
    const text = '## [1.0.0] - 2026-01-01\n\n```\ntext\n';
    // Act
    const { unterminated } = parseChangelog(text);
    // Assert
    assert.equal(unterminated, true);
  });

  test('returns no sections for text without version headings', () => {
    // Arrange
    const text = '# Changelog\n\nnothing here\n';
    // Act
    const { sections, unterminated } = parseChangelog(text);
    // Assert
    assert.deepEqual(sections, []);
    assert.equal(unterminated, false);
  });
});

describe('detectPrefix', () => {
  test('reads a bare prefix from existing tags', () => {
    // Arrange
    const tags = ['1.0.0', '0.9.0'];
    // Act
    const result = detectPrefix(tags, {}, ['1.0.0']);
    // Assert
    assert.deepEqual(result, { prefix: '', source: 'tags' });
  });

  test('falls back to the changelog links when no tag is a version', () => {
    // Arrange
    const refs = { '1.0.0': `${REPO}/compare/v0.9.0...v1.0.0` };
    // Act
    const result = detectPrefix(['latest'], refs, ['1.0.0']);
    // Assert
    assert.deepEqual(result, { prefix: 'v', source: 'changelog links' });
  });

  test('reports mixed tag forms as ambiguous', () => {
    // Arrange
    const tags = ['1.0.0', 'v0.9.0'];
    // Act
    const result = detectPrefix(tags, {}, []);
    // Assert
    assert.equal(result.error.code, 'prefix-ambiguous');
  });

  test('reports an unknown prefix when neither tags nor links show it', () => {
    // Arrange
    const tags = ['latest', 'nightly'];
    // Act
    const result = detectPrefix(tags, {}, ['1.0.0']);
    // Assert
    assert.equal(result.error.code, 'prefix-unknown');
  });
});

describe('plan', () => {
  test('picks the top released section with notes and a compare link', () => {
    // Arrange
    const input = { changelog: CL, tags: ['v1.0.0'], repoUrl: REPO };
    // Act
    const r = plan(input);
    // Assert
    assert.equal(r.ok, true);
    assert.equal(r.version, '1.1.0');
    assert.equal(r.tag, 'v1.1.0');
    assert.equal(r.prefixSource, 'tags');
    assert.ok(r.notes.startsWith('### Added\n\n- b'));
    assert.ok(r.notes.endsWith(`**Full Changelog**: ${REPO}/compare/v1.0.0...v1.1.0\n`));
  });

  test('leaves unreleased and older notes out of the release notes', () => {
    // Arrange
    const input = { changelog: CL, tags: ['v1.0.0'], repoUrl: REPO };
    // Act
    const r = plan(input);
    // Assert
    assert.ok(!r.notes.includes('next') && !r.notes.includes('- a'));
  });

  test('omits the compare link when the previous tag does not exist', () => {
    // Arrange
    const input = { changelog: CL, tags: [], prefix: 'v', repoUrl: REPO };
    // Act
    const r = plan(input);
    // Assert
    assert.ok(!r.notes.includes('Full Changelog'));
  });

  test('uses an explicit prefix flag over the tags', () => {
    // Arrange
    const input = { changelog: CL, tags: ['1.0.0'], prefix: 'v' };
    // Act
    const r = plan(input);
    // Assert
    assert.equal(r.tag, 'v1.1.0');
    assert.equal(r.prefixSource, 'flag');
  });

  test('rejects an Unreleased-only changelog', () => {
    // Arrange
    const input = { changelog: '## [Unreleased]\n\n- x\n' };
    // Act
    const r = plan(input);
    // Assert
    assert.deepEqual(codes(r), ['unreleased-only']);
  });

  test('rejects a changelog with no release section', () => {
    // Arrange
    const input = { changelog: '# Changelog\n' };
    // Act
    const r = plan(input);
    // Assert
    assert.deepEqual(codes(r), ['no-release']);
  });

  test('rejects a version that is not SemVer', () => {
    // Arrange
    const input = { changelog: sec('## [1.0] - 2026-01-01'), prefix: 'v' };
    // Act
    const r = plan(input);
    // Assert
    assert.deepEqual(codes(r), ['invalid-semver']);
  });

  test('rejects an impossible date', () => {
    // Arrange
    const input = { changelog: sec('## [1.0.0] - 2026-02-30'), prefix: 'v' };
    // Act
    const r = plan(input);
    // Assert
    assert.deepEqual(codes(r), ['invalid-date']);
  });

  test('rejects a missing date', () => {
    // Arrange
    const input = { changelog: sec('## [1.0.0]'), prefix: 'v' };
    // Act
    const r = plan(input);
    // Assert
    assert.deepEqual(codes(r), ['invalid-date']);
  });

  test('rejects a section marked unreleased', () => {
    // Arrange
    const input = { changelog: sec('## [1.0.0] - Unreleased'), prefix: 'v' };
    // Act
    const r = plan(input);
    // Assert
    assert.ok(codes(r).includes('unreleased'));
  });

  test('rejects a yanked top release', () => {
    // Arrange
    const input = { changelog: sec('## [1.0.0] - 2026-01-01 [YANKED]'), prefix: 'v' };
    // Act
    const r = plan(input);
    // Assert
    assert.deepEqual(codes(r), ['yanked']);
  });

  test('rejects a pre-release version', () => {
    // Arrange
    const input = { changelog: sec('## [1.0.0-rc.1] - 2026-01-01'), prefix: 'v' };
    // Act
    const r = plan(input);
    // Assert
    assert.deepEqual(codes(r), ['prerelease']);
  });

  test('rejects a release with empty notes', () => {
    // Arrange
    const input = { changelog: sec('## [1.0.0] - 2026-01-01', ''), prefix: 'v' };
    // Act
    const r = plan(input);
    // Assert
    assert.deepEqual(codes(r), ['empty-notes']);
  });

  test('rejects sections ordered oldest first', () => {
    // Arrange
    const changelog = '## [1.0.0] - 2026-01-01\n\n- a\n\n## [1.1.0] - 2026-02-01\n\n- b\n';
    // Act
    const r = plan({ changelog, prefix: 'v' });
    // Assert
    assert.deepEqual(codes(r), ['not-newest']);
  });

  test('rejects a duplicated version', () => {
    // Arrange
    const changelog = '## [1.0.0] - 2026-01-01\n\n- a\n\n## [1.0.0] - 2026-01-01\n\n- a\n';
    // Act
    const r = plan({ changelog, prefix: 'v' });
    // Assert
    assert.deepEqual(codes(r), ['duplicate-version']);
  });

  test('rejects a prefix other than v or none', () => {
    // Arrange
    const input = { changelog: CL, prefix: 'rel-' };
    // Act
    const r = plan(input);
    // Assert
    assert.deepEqual(codes(r), ['invalid-prefix']);
  });

  test('rejects mixed tag forms without a prefix flag', () => {
    // Arrange
    const input = { changelog: CL, tags: ['1.0.0', 'v0.9.0'] };
    // Act
    const r = plan(input);
    // Assert
    assert.deepEqual(codes(r), ['prefix-ambiguous']);
  });

  test('rejects an unterminated code fence', () => {
    // Arrange
    const input = { changelog: '## [1.0.0] - 2026-01-01\n\n```\ntext\n' };
    // Act
    const r = plan(input);
    // Assert
    assert.deepEqual(codes(r), ['unterminated-fence']);
  });
});

describe('main', () => {
  const stubs = (over = {}) => {
    const calls = { log: [], error: [], write: [], mkdir: [] };
    const deps = {
      cwd: () => '/repo',
      existsSync: () => true,
      readFileSync: () => CL,
      git: () => ({ stdout: Buffer.from('1.0.0\n') }),
      mkdirSync: (dir) => calls.mkdir.push(dir),
      writeFileSync: (file, text) => calls.write.push([file, text]),
      log: (text) => calls.log.push(text),
      error: (text) => calls.error.push(text),
      ...over
    };
    return { calls, deps };
  };

  test('prints the plan as JSON and exits 0 for a valid changelog', () => {
    // Arrange
    const { calls, deps } = stubs();
    // Act
    const code = main(['plan', '--repo-url', REPO], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(calls.log[0]).tag, '1.1.0');
  });

  test('writes the notes file when --notes-out is given', () => {
    // Arrange
    const { calls, deps } = stubs();
    const out = path.join('nested', 'notes.md');
    // Act
    const code = main(['plan', '--notes-out', out], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(calls.mkdir, ['nested']);
    assert.equal(calls.write[0][0], out);
    assert.equal(calls.write[0][1], JSON.parse(calls.log[0]).notes);
  });

  test('exits 2 with usage for an unknown subcommand', () => {
    // Arrange
    const { calls, deps } = stubs();
    // Act
    const code = main([], deps);
    // Assert
    assert.equal(code, 2);
    assert.match(calls.error[0], /usage: changelog-release\.mjs plan/);
  });

  test('exits 1 with no-changelog when the file is missing', () => {
    // Arrange
    const { calls, deps } = stubs({ existsSync: () => false });
    // Act
    const code = main(['plan', '--changelog', 'missing.md'], deps);
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(calls.log[0]).errors[0].code, 'no-changelog');
  });

  test('exits 1 and writes nothing when the plan has errors', () => {
    // Arrange
    const { calls, deps } = stubs({ readFileSync: () => '# Changelog\n' });
    // Act
    const code = main(['plan', '--notes-out', 'notes.md'], deps);
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(calls.write, []);
  });
});
