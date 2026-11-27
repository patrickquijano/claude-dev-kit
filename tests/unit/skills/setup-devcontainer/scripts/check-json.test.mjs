import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isInside, isSafePath, main } from '../../../../../skills/setup-devcontainer/scripts/check-json.mjs';

describe('isSafePath', () => {
  test('accepts an absolute path of safe characters', () => {
    // Act
    const results = [isSafePath('/a/.devcontainer/devcontainer.json'), isSafePath('/x/my-repo_1/a.json')];
    // Assert
    assert.deepEqual(results, [true, true]);
  });

  test('accepts a dotted name that merely starts with two dots', () => {
    // Act
    const results = [isSafePath('/a/..x.json'), isSafePath('/a/b..c/d.json')];
    // Assert
    assert.deepEqual(results, [true, true]);
  });

  test('rejects relative, dotdot, and metacharacter paths', () => {
    // Act
    const results = [
      isSafePath('a/b.json'),
      isSafePath('/a/../b.json'),
      isSafePath('/a/b;rm'),
      isSafePath("/a/'b"),
      isSafePath('/a b')
    ];
    // Assert
    assert.deepEqual(results, [false, false, false, false, false]);
  });
});

describe('isInside', () => {
  test('accepts a path below the root', () => {
    // Act
    const results = [isInside('/a', '/a/b.json'), isInside('/a', '/a/.devcontainer/devcontainer.json')];
    // Assert
    assert.deepEqual(results, [true, true]);
  });

  test('accepts a child whose name starts with two dots', () => {
    // Act
    const results = [isInside('/a', '/a/..x.json'), isInside('/a', '/a/..x/y.json')];
    // Assert
    assert.deepEqual(results, [true, true]);
  });

  test('rejects the root itself and paths outside it', () => {
    // Act
    const results = [
      isInside('/a', '/a'),
      isInside('/a', '/b/c.json'),
      isInside('/a', '/ab/c.json'),
      isInside('/a/b', '/a/c')
    ];
    // Assert
    assert.deepEqual(results, [false, false, false, false]);
  });
});

describe('main', () => {
  const run = (argv, text = '{"name":"x"}', opts = {}) => {
    const errors = [];
    const reads = [];
    const code = main(argv, {
      readFile: (p) => {
        reads.push(p);
        if (text instanceof Error) throw text;
        return text;
      },
      realpath: opts.realpath ?? ((p) => p),
      env: opts.env ?? { CLAUDE_PROJECT_DIR: '/a' },
      cwd: () => opts.cwd ?? '/elsewhere',
      error: (t) => errors.push(t)
    });
    return { code, errors, reads };
  };

  test('exits 2 with one line and no read when the real path is outside the project', () => {
    // Act
    const { code, errors, reads } = run(['/a/link.json'], undefined, {
      realpath: (p) => (p === '/a/link.json' ? '/etc/secret.json' : p)
    });
    // Assert
    assert.equal(code, 2);
    assert.equal(errors.length, 1);
    assert.deepEqual(reads, []);
  });

  test('exits 2 for a path outside CLAUDE_PROJECT_DIR', () => {
    // Act
    const { code, reads } = run(['/b/c.json']);
    // Assert
    assert.equal(code, 2);
    assert.deepEqual(reads, []);
  });

  test('falls back to the working directory when CLAUDE_PROJECT_DIR is unset', () => {
    // Act
    const inside = run(['/w/x.json'], undefined, { env: {}, cwd: '/w' });
    const outside = run(['/a/x.json'], undefined, { env: {}, cwd: '/w' });
    // Assert
    assert.equal(inside.code, 0);
    assert.equal(outside.code, 2);
  });

  const enoent = () => Object.assign(new Error('ENOENT'), { code: 'ENOENT' });

  test('keeps the lexical path when only the leaf is missing', () => {
    // Arrange
    const leafMissing = (p) => {
      if (p === '/a/b.json') throw enoent();
      return p;
    };
    // Act
    const { code, reads } = run(['/a/b.json'], undefined, { realpath: leafMissing });
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(reads, ['/a/b.json']);
  });

  test('reads the resolved path for a missing leaf under a symlinked parent', () => {
    // Arrange
    const realpath = (p) => {
      if (p === '/a/link/b.json') throw enoent();
      if (p === '/a/link') return '/a/real';
      return p;
    };
    // Act
    const { code, reads } = run(['/a/link/b.json'], undefined, { realpath });
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(reads, ['/a/real/b.json']);
  });

  test('exits 2 with no read for a missing leaf under a parent that resolves outside', () => {
    // Arrange
    const realpath = (p) => {
      if (p === '/a/link/b.json') throw enoent();
      if (p === '/a/link') return '/etc';
      return p;
    };
    // Act
    const { code, errors, reads } = run(['/a/link/b.json'], undefined, { realpath });
    // Assert
    assert.equal(code, 2);
    assert.equal(errors.length, 1);
    assert.deepEqual(reads, []);
  });

  test('exits 2 with one line and no read when the project directory is missing', () => {
    // Arrange
    const realpath = (p) => {
      if (p === '/a') throw enoent();
      return p;
    };
    // Act
    const { code, errors, reads } = run(['/a/b.json'], undefined, { realpath });
    // Assert
    assert.equal(code, 2);
    assert.deepEqual(errors, ['check-json: project directory not found']);
    assert.deepEqual(reads, []);
  });

  test('rethrows a project directory failure that is not ENOENT', () => {
    // Arrange
    const realpath = (p) => {
      if (p === '/a') throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
      return p;
    };
    // Act
    const call = () => run(['/a/b.json'], undefined, { realpath });
    // Assert
    assert.throws(call, /EACCES/);
  });

  test('rethrows a realpath failure that is not ENOENT', () => {
    // Arrange
    const realpath = (p) => {
      if (p === '/a/b.json') throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
      return p;
    };
    // Act
    const call = () => run(['/a/b.json'], undefined, { realpath });
    // Assert
    assert.throws(call, /EACCES/);
  });

  test('exits 0 with no output for valid JSON', () => {
    // Act
    const { code, errors, reads } = run(['/a/devcontainer.json']);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(reads, ['/a/devcontainer.json']);
  });

  test('exits 0 for a JSON array', () => {
    // Act
    const { code, errors } = run(['/a/b.json'], '[1, 2]');
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(errors, []);
  });

  test('exits 1 with one line and no contents for invalid JSON', () => {
    // Act
    const { code, errors } = run(['/a/b.json'], '{"secret": oops,}');
    // Assert
    assert.equal(code, 1);
    assert.equal(errors.length, 1);
    assert.ok(errors[0].includes('/a/b.json'));
    assert.ok(!errors[0].includes('secret'));
  });

  test('exits 1 for an empty file', () => {
    // Act
    const { code, errors } = run(['/a/b.json'], '');
    // Assert
    assert.equal(code, 1);
    assert.equal(errors.length, 1);
  });

  test('exits 2 with one usage line and no read on a missing, relative, or dotdot path', () => {
    // Act
    const results = [run([]), run(['a/b.json']), run(['/a/../b.json']), run(['/a', '/b'])];
    // Assert
    assert.deepEqual(
      results.map((r) => r.code),
      [2, 2, 2, 2]
    );
    assert.ok(results.every((r) => r.errors.length === 1 && r.reads.length === 0));
  });

  test('rethrows a read failure that is not a parse error', () => {
    // Arrange
    const failure = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    // Act
    const call = () => run(['/a/b.json'], failure);
    // Assert
    assert.throws(call, /ENOENT/);
  });
});
