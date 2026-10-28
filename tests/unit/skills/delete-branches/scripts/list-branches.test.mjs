import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  isProtected,
  main,
  pageCandidates,
  parseRefLines,
  parseTrack
} from '../../../../../skills/delete-branches/scripts/list-branches.mjs';

const SEP = '\x1f';
const line = (ref, upstream = '', track = '', date = '2026-01-02', subject = 'subj') =>
  [ref, upstream, track, date, subject].join(SEP);
const cands = (n) => Array.from({ length: n }, (_, i) => ({ name: `b${i + 1}`, description: `d${i + 1}` }));
const sizes = (pages) => pages.flat().map((q) => q.options.length);

describe('parseTrack', () => {
  test('reports a gone upstream', () => {
    // Act
    const result = parseTrack('origin/x', '[gone]');
    // Assert
    assert.equal(result, 'upstream gone');
  });

  test('reports ahead and behind counts', () => {
    // Act
    const result = parseTrack('origin/x', '[ahead 1, behind 2]');
    // Assert
    assert.equal(result, 'ahead 1, behind 2');
  });

  test('reports no upstream when none is set', () => {
    // Act
    const result = parseTrack('', '');
    // Assert
    assert.equal(result, 'no upstream');
  });

  test('reports in sync when the track is empty', () => {
    // Act
    const result = parseTrack('origin/x', '');
    // Assert
    assert.equal(result, 'in sync with origin/x');
  });
});

describe('isProtected', () => {
  test('matches an exact name', () => {
    // Act
    const result = isProtected('main', ['develop', 'main']);
    // Assert
    assert.equal(result, true);
  });

  test('matches a glob across a slash', () => {
    // Act
    const result = isProtected('release/1.2/rc', ['release/*']);
    // Assert
    assert.equal(result, true);
  });

  test('does not match a different name or a partial one', () => {
    // Act
    const result = [isProtected('mainline', ['main']), isProtected('feat/x', ['release/*'])];
    // Assert
    assert.deepEqual(result, [false, false]);
  });

  test('treats regex characters in a pattern literally', () => {
    // Act
    const result = [isProtected('v1.0', ['v1.0']), isProtected('v1x0', ['v1.0*'])];
    // Assert
    assert.deepEqual(result, [true, false]);
  });
});

describe('pageCandidates', () => {
  test('returns no pages for no candidates', () => {
    // Act
    const result = pageCandidates([], 'Local');
    // Assert
    assert.deepEqual(result, []);
  });

  test('adds a Keep all option to a single candidate', () => {
    // Act
    const result = pageCandidates(cands(1), 'Local');
    // Assert
    assert.deepEqual(
      result[0][0].options.map((o) => o.label),
      ['b1', 'Keep all']
    );
  });

  test('splits 9 candidates into 4+3+2 in one call', () => {
    // Act
    const result = pageCandidates(cands(9), 'Remote');
    // Assert
    assert.equal(result.length, 1);
    assert.deepEqual(sizes(result), [4, 3, 2]);
  });

  test('never leaves a 1-option question and caps a call at 4 questions', () => {
    // Act
    const result = pageCandidates(cands(18), 'Local');
    // Assert
    assert.deepEqual(
      result.map((c) => c.length),
      [4, 1]
    );
    assert.ok(sizes(result).every((n) => n >= 2 && n <= 4));
    assert.equal(
      sizes(result).reduce((a, b) => a + b, 0),
      18
    );
  });
});

describe('parseRefLines', () => {
  test('strips the prefix and describes a local branch', () => {
    // Arrange
    const text = line('refs/heads/feat/a', 'origin/feat/a', '[gone]');
    // Act
    const result = parseRefLines(text, 'refs/heads/', true);
    // Assert
    assert.deepEqual(result, [{ name: 'feat/a', description: 'upstream gone; 2026-01-02 subj' }]);
  });

  test('drops the remote HEAD and refs outside the prefix', () => {
    // Arrange
    const text = [line('refs/remotes/origin/HEAD'), line('refs/remotes/other/x'), line('refs/remotes/origin/b')].join(
      '\n'
    );
    // Act
    const result = parseRefLines(text, 'refs/remotes/origin/', false);
    // Assert
    assert.deepEqual(
      result.map((c) => c.name),
      ['b']
    );
  });

  test('sorts by name', () => {
    // Arrange
    const text = [line('refs/heads/b'), line('refs/heads/a')].join('\n');
    // Act
    const result = parseRefLines(text, 'refs/heads/', true);
    // Assert
    assert.deepEqual(
      result.map((c) => c.name),
      ['a', 'b']
    );
  });

  test('returns nothing for empty input', () => {
    // Act
    const result = parseRefLines('', 'refs/heads/', true);
    // Assert
    assert.deepEqual(result, []);
  });
});

describe('main', () => {
  const run = (argv, stdout = '', status = 0, stderr = '') => {
    const logs = [];
    const errors = [];
    const code = main(argv, {
      run: () => ({ status, stdout, stderr }),
      log: (t) => logs.push(t),
      error: (t) => errors.push(t)
    });
    return { code, out: logs[0] && JSON.parse(logs[0]), errors };
  };

  test('lists candidates, excludes protected, and skips unsafe names', () => {
    // Arrange
    const stdout = [line('refs/heads/main'), line('refs/heads/feat/a'), line("refs/heads/it's")].join('\n');
    // Act
    const { code, out } = run(['/r', 'local', '--protected', 'main'], stdout);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(
      out.candidates.map((c) => c.name),
      ['feat/a']
    );
    assert.deepEqual(out.excluded, ['main']);
    assert.deepEqual(
      out.skipped.map((s) => s.name),
      ["it's"]
    );
  });

  test('lists remote branches without a local-only description', () => {
    // Act
    const { code, out } = run(['/r', 'remote', 'origin'], line('refs/remotes/origin/x'));
    // Assert
    assert.equal(code, 0);
    assert.equal(out.candidates[0].description, '2026-01-02 subj');
  });

  test('exits 1 with git-error on a git failure', () => {
    // Act
    const { code, out } = run(['/r', 'local'], '', 128, 'fatal: not a git repository\n');
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(out, { ok: false, code: 'git-error', message: 'fatal: not a git repository' });
  });

  test('exits 2 on a missing remote, unknown mode, or dangling flag', () => {
    // Act
    const results = [run(['/r', 'remote']), run(['/r', 'both']), run(['/r', 'local', '--protected'])];
    // Assert
    assert.deepEqual(
      results.map((r) => r.code),
      [2, 2, 2]
    );
    assert.match(results[0].errors[0], /usage/);
  });
});
