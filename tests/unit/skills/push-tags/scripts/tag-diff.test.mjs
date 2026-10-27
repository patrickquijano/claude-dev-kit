import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { diffTags, main, parseRefs } from '../../../../../skills/push-tags/scripts/tag-diff.mjs';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);

describe('parseRefs', () => {
  test('maps a lightweight tag to its sha', () => {
    // Arrange
    const text = `${A} refs/tags/v1.0.0\n`;
    // Act
    const result = parseRefs(text);
    // Assert
    assert.deepEqual([...result], [['v1.0.0', A]]);
  });

  test('prefers the peeled commit over the tag object for an annotated tag', () => {
    // Arrange
    const text = `${B} refs/tags/v2.0.0\n${C} refs/tags/v2.0.0^{}\n`;
    // Act
    const result = parseRefs(text);
    // Assert
    assert.deepEqual([...result], [['v2.0.0', C]]);
  });

  test('ignores a peeled line that comes first and never lists it as a name', () => {
    // Arrange
    const text = `${C} refs/tags/v2.0.0^{}\n${B} refs/tags/v2.0.0\n`;
    // Act
    const result = parseRefs(text);
    // Assert
    assert.deepEqual([...result.keys()], ['v2.0.0']);
    assert.equal(result.get('v2.0.0'), C);
  });

  test('skips non-tag refs and blank input', () => {
    // Arrange
    const text = `${A} refs/heads/main\n\n`;
    // Act
    const result = parseRefs(text);
    // Assert
    assert.equal(result.size, 0);
    assert.equal(parseRefs(undefined).size, 0);
  });
});

describe('diffTags', () => {
  test('lists local-only tags as unpushed, sorted', () => {
    // Arrange
    const local = new Map([
      ['v2', B],
      ['v1', A]
    ]);
    // Act
    const result = diffTags(local, new Map());
    // Assert
    assert.deepEqual(result.unpushed, [
      { tag: 'v1', commit: A },
      { tag: 'v2', commit: B }
    ]);
  });

  test('reports a same-name different-commit tag as a mismatch, not unpushed', () => {
    // Arrange
    const local = new Map([['v1', A]]);
    const remote = new Map([['v1', B]]);
    // Act
    const result = diffTags(local, remote);
    // Assert
    assert.deepEqual(result.unpushed, []);
    assert.deepEqual(result.mismatches, [{ tag: 'v1', local: A, remote: B }]);
    assert.deepEqual(result.remoteTags, ['v1']);
  });

  test('treats an identical tag as neither unpushed nor mismatched', () => {
    // Arrange
    const local = new Map([['v1', A]]);
    // Act
    const result = diffTags(local, new Map([['v1', A]]));
    // Assert
    assert.deepEqual([result.unpushed, result.mismatches], [[], []]);
  });

  test('ignores remote-only tags for unpushed', () => {
    // Arrange
    const remote = new Map([['old', A]]);
    // Act
    const result = diffTags(new Map(), remote);
    // Assert
    assert.deepEqual(result.unpushed, []);
    assert.deepEqual(result.remoteTags, ['old']);
  });
});

describe('main', () => {
  const harness = (runs) => {
    const out = { logs: [], errors: [], calls: [] };
    const deps = {
      run: (args) => {
        out.calls.push(args);
        return runs.shift();
      },
      log: (t) => out.logs.push(t),
      error: (t) => out.errors.push(t)
    };
    return { out, deps };
  };

  test('prints the diff JSON and exits 0', () => {
    // Arrange
    const { out, deps } = harness([
      { status: 0, stdout: `${A} refs/tags/v1\n`, stderr: '' },
      { status: 0, stdout: '', stderr: '' }
    ]);
    // Act
    const code = main(['/r', 'origin'], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(out.logs[0]), {
      ok: true,
      unpushed: [{ tag: 'v1', commit: A }],
      mismatches: [],
      remoteTags: []
    });
    assert.deepEqual(out.calls[0], ['-C', '/r', 'show-ref', '--tags', '--dereference']);
    assert.deepEqual(out.calls[1], ['-C', '/r', 'ls-remote', '--tags', 'origin']);
  });

  test('treats show-ref exit 1 with no output as no local tags', () => {
    // Arrange
    const { out, deps } = harness([
      { status: 1, stdout: '', stderr: '' },
      { status: 0, stdout: '', stderr: '' }
    ]);
    // Act
    const code = main(['/r', 'origin'], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(out.logs[0]).unpushed, []);
  });

  test('exits 1 with remote-error and the first stderr line when ls-remote fails', () => {
    // Arrange
    const { out, deps } = harness([
      { status: 0, stdout: '', stderr: '' },
      { status: 128, stdout: '', stderr: '\nfatal: unable to access\nmore\n' }
    ]);
    // Act
    const code = main(['/r', 'origin'], deps);
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(JSON.parse(out.logs[0]), { ok: false, code: 'remote-error', message: 'fatal: unable to access' });
  });

  test('exits 1 when show-ref fails for another reason', () => {
    // Arrange
    const { out, deps } = harness([{ status: 128, stdout: '', stderr: 'fatal: not a git repository\n' }]);
    // Act
    const code = main(['/r', 'origin'], deps);
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(out.logs[0]).message, 'fatal: not a git repository');
  });

  test('exits 2 with usage for missing or empty arguments', () => {
    // Arrange
    const { out, deps } = harness([]);
    // Act
    const codes = [main([], deps), main(['/r'], deps), main(['/r', ''], deps)];
    // Assert
    assert.deepEqual(codes, [2, 2, 2]);
    assert.equal(out.errors.length, 3);
  });
});
