import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  candidates,
  compareTags,
  detectConvention,
  latestStable,
  main,
  parseTag,
  planTags,
  signals
} from '../../../../../skills/create-github-release/scripts/tag-plan.mjs';

describe('parseTag', () => {
  test('parses a v-prefixed pre-release tag', () => {
    // Arrange
    const tag = 'v1.2.3-rc.1';
    // Act
    const result = parseTag(tag);
    // Assert
    assert.deepEqual([result.prefix, result.version, result.pre], ['v', '1.2.3-rc.1', ['rc', '1']]);
  });

  test('parses a bare tag', () => {
    // Arrange
    const tag = '0.6.0';
    // Act
    const result = parseTag(tag);
    // Assert
    assert.deepEqual([result.prefix, result.minor], ['', 6]);
  });

  test('returns null for a non-SemVer tag', () => {
    // Arrange
    const tags = ['latest', 'v1.2', '01.2.3', ''];
    // Act
    const result = tags.map(parseTag);
    // Assert
    assert.deepEqual(result, [null, null, null, null]);
  });

  test('returns null for a non-string', () => {
    // Arrange
    const tag = undefined;
    // Act
    const result = parseTag(tag);
    // Assert
    assert.equal(result, null);
  });
});

describe('compareTags', () => {
  test('orders by numeric parts', () => {
    // Arrange
    const [a, b] = [parseTag('v1.2.10'), parseTag('v1.2.9')];
    // Act
    const result = compareTags(a, b);
    // Assert
    assert.ok(result > 0);
  });

  test('puts a pre-release below its release', () => {
    // Arrange
    const [a, b] = [parseTag('v1.0.0-rc.2'), parseTag('v1.0.0')];
    // Act
    const result = compareTags(a, b);
    // Assert
    assert.ok(result < 0);
  });

  test('returns 0 for equal versions', () => {
    // Arrange
    const [a, b] = [parseTag('v1.0.0'), parseTag('1.0.0')];
    // Act
    const result = compareTags(a, b);
    // Assert
    assert.equal(result, 0);
  });

  test('compares pre-release identifiers numerically', () => {
    // Arrange
    const [a, b] = [parseTag('v1.0.0-rc.10'), parseTag('v1.0.0-rc.9')];
    // Act
    const result = compareTags(a, b);
    // Assert
    assert.ok(result > 0);
  });
});

describe('detectConvention', () => {
  test('detects the v prefix and the pre-release style', () => {
    // Arrange
    const tags = ['v0.5.0', 'v0.6.0-beta.1'];
    // Act
    const result = detectConvention(tags);
    // Assert
    assert.deepEqual([result.prefix, result.scheme, result.style], ['v', 'semver', 'beta']);
  });

  test('detects CalVer when every major is a year', () => {
    // Arrange
    const tags = ['2026.9.0', '2026.10.1'];
    // Act
    const result = detectConvention(tags);
    // Assert
    assert.deepEqual([result.prefix, result.scheme], ['', 'calver']);
  });

  test('prefix is null for mixed forms and for no tags', () => {
    // Arrange
    const inputs = [['v1.0.0', '1.1.0'], []];
    // Act
    const result = inputs.map((t) => detectConvention(t).prefix);
    // Assert
    assert.deepEqual(result, [null, null]);
  });

  test('ignores non-SemVer tags', () => {
    // Arrange
    const tags = ['nightly', 'v1.0.0'];
    // Act
    const result = detectConvention(tags);
    // Assert
    assert.equal(result.parsed, 1);
  });
});

describe('latestStable', () => {
  test('returns the highest stable tag and skips pre-releases', () => {
    // Arrange
    const tags = ['v1.0.0', 'v1.2.0', 'v1.3.0-rc.1', 'v1.1.0'];
    // Act
    const result = latestStable(tags);
    // Assert
    assert.equal(result.tag, 'v1.2.0');
  });

  test('returns null without a stable tag', () => {
    // Arrange
    const tags = ['v1.0.0-rc.1', 'latest'];
    // Act
    const result = latestStable(tags);
    // Assert
    assert.equal(result, null);
  });
});

describe('signals', () => {
  test('counts breaking, feat, fix, and other subjects', () => {
    // Arrange
    const commits = ['feat!: drop hook', 'feat(x): add', 'fix: bug', 'docs: readme', 'chore: x\n\nBREAKING CHANGE: y'];
    // Act
    const result = signals(commits);
    // Assert
    assert.deepEqual([result.breaking, result.feat, result.fix, result.other], [2, 1, 1, 1]);
  });

  test('counts labels', () => {
    // Arrange
    const labels = ['bug', 'bug', 'enhancement'];
    // Act
    const result = signals([], labels);
    // Assert
    assert.deepEqual(result.labels, { bug: 2, enhancement: 1 });
  });

  test('counts a non-conventional subject as other', () => {
    // Arrange
    const commits = ['Update things'];
    // Act
    const result = signals(commits);
    // Assert
    assert.equal(result.other, 1);
  });

  test('returns zeros for no commits', () => {
    // Arrange
    const commits = [];
    // Act
    const result = signals(commits);
    // Assert
    assert.deepEqual([result.breaking, result.feat, result.fix, result.other], [0, 0, 0, 0]);
  });
});

describe('candidates', () => {
  const semver = { prefix: 'v', scheme: 'semver', style: 'rc' };

  test('lists patch, minor, major, and pre-release with section flags', () => {
    // Arrange
    const input = { tags: ['v0.5.0'], convention: semver, changelogVersions: ['0.6.0', '0.5.0'] };
    // Act
    const result = candidates(input);
    // Assert
    assert.deepEqual(
      result.map((c) => [c.kind, c.tag, c.hasSection]),
      [
        ['patch', 'v0.5.1', false],
        ['minor', 'v0.6.0', true],
        ['major', 'v1.0.0', false],
        ['prerelease', 'v0.6.0-rc.1', false]
      ]
    );
  });

  test('increments an existing pre-release of the same base', () => {
    // Arrange
    const input = { tags: ['v0.5.0', 'v0.6.0-rc.1'], convention: semver };
    // Act
    const result = candidates(input).find((c) => c.kind === 'prerelease');
    // Assert
    assert.equal(result.tag, 'v0.6.0-rc.2');
  });

  test('offers first versions when there is no stable tag', () => {
    // Arrange
    const input = { tags: [], convention: { ...semver, prefix: null } };
    // Act
    const result = candidates(input);
    // Assert
    assert.deepEqual(
      result.map((c) => c.tag),
      ['v0.1.0', 'v1.0.0']
    );
  });

  test('CalVer restarts the micro in a new month and increments in the same one', () => {
    // Arrange
    const convention = { prefix: '', scheme: 'calver', style: 'rc' };
    // Act
    const same = candidates({ tags: ['2026.10.0'], convention, today: '2026-10-27' });
    const next = candidates({ tags: ['2026.9.4'], convention, today: '2026-10-27' });
    // Assert
    assert.deepEqual([same[0].tag, next[0].tag], ['2026.10.1', '2026.10.0']);
  });

  test('CalVer without a valid today yields no candidate', () => {
    // Arrange
    const convention = { prefix: '', scheme: 'calver', style: 'rc' };
    // Act
    const result = candidates({ tags: ['2026.10.0'], convention, today: 'soon' });
    // Assert
    assert.deepEqual(result, []);
  });
});

describe('planTags', () => {
  test('returns the convention, latest stable, candidates, and signals', () => {
    // Arrange
    const input = { tags: ['v0.5.0', 'v0.6.0'], commits: ['feat: a'], changelogVersions: ['0.7.0'] };
    // Act
    const result = planTags(input);
    // Assert
    assert.deepEqual(
      [result.ok, result.latestStable, result.signals.feat, result.candidates[1].hasSection],
      [true, 'v0.6.0', 1, true]
    );
  });

  test('rejects a non-array field', () => {
    // Arrange
    const input = { tags: 'v1.0.0' };
    // Act
    const result = planTags(input);
    // Assert
    assert.equal(result.code, 'bad-input');
  });

  test('rejects CalVer tags without today', () => {
    // Arrange
    const input = { tags: ['2026.10.0'] };
    // Act
    const result = planTags(input);
    // Assert
    assert.equal(result.code, 'bad-today');
  });

  test('rejects a missing input', () => {
    // Arrange
    const input = undefined;
    // Act
    const result = planTags(input);
    // Assert
    assert.equal(result.code, 'bad-input');
  });
});

describe('main', () => {
  const run = (argv, stdin) => {
    const out = { logs: [], errors: [] };
    const code = main(argv, {
      readStdin: () => stdin,
      log: (t) => out.logs.push(t),
      error: (t) => out.errors.push(t)
    });
    return { code, out };
  };

  test('prints the plan and exits 0', () => {
    // Arrange
    const stdin = JSON.stringify({ tags: ['v1.0.0'] });
    // Act
    const { code, out } = run([], stdin);
    // Assert
    assert.deepEqual([code, JSON.parse(out.logs[0]).latestStable], [0, 'v1.0.0']);
  });

  test('exits 1 on invalid JSON', () => {
    // Arrange
    const stdin = '{nope';
    // Act
    const { code, out } = run([], stdin);
    // Assert
    assert.deepEqual([code, JSON.parse(out.logs[0]).code], [1, 'bad-json']);
  });

  test('exits 2 with usage when given arguments', () => {
    // Arrange
    const argv = ['--x'];
    // Act
    const { code, out } = run(argv, '{}');
    // Assert
    assert.deepEqual([code, /usage/.test(out.errors[0])], [2, true]);
  });

  test('exits 1 when the plan is a stop', () => {
    // Arrange
    const stdin = JSON.stringify({ tags: 'x' });
    // Act
    const { code } = run([], stdin);
    // Assert
    assert.equal(code, 1);
  });
});
