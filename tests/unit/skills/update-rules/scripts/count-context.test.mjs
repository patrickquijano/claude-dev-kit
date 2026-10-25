import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import {
  countContext,
  countNonBlank,
  findImports,
  main,
  matchesGlob,
  parsePaths
} from '../../../../../skills/update-rules/scripts/count-context.mjs';

const ROOT = path.resolve('/stub/proj');
const at = (...p) => path.join(ROOT, ...p);

// Stub fs from a `{ absolutePath: text }` map; directories are implied by their children.
function fsStub(files, extra = {}) {
  const dirs = new Set();
  for (const f of Object.keys(files)) for (let d = path.dirname(f); !dirs.has(d); d = path.dirname(d)) dirs.add(d);
  return {
    existsSync: (p) => p in files || dirs.has(p),
    readFileSync: (p) => files[p],
    readdirSync: (dir) =>
      Object.keys(files)
        .filter((f) => f.startsWith(`${dir}${path.sep}`))
        .map((f) => path.relative(dir, f)),
    trackedFiles: () => [],
    matchesGlob: (file, glob) => file.endsWith(glob.replace('**/*', '')),
    ...extra
  };
}

describe('countNonBlank', () => {
  test('counts only non-blank lines', () => {
    // Arrange
    const text = 'a\n\n  \nb\r\nc\n';
    // Act
    const result = countNonBlank(text);
    // Assert
    assert.equal(result, 3);
  });

  test('counts a single line without a trailing newline', () => {
    // Arrange
    const text = 'only';
    // Act
    const result = countNonBlank(text);
    // Assert
    assert.equal(result, 1);
  });

  test('returns 0 for empty text', () => {
    // Arrange
    const text = '';
    // Act
    const result = countNonBlank(text);
    // Assert
    assert.equal(result, 0);
  });

  test('returns 0 for whitespace only and for undefined', () => {
    // Arrange
    const inputs = ['\n \n\t\n', undefined];
    // Act
    const results = inputs.map(countNonBlank);
    // Assert
    assert.deepEqual(results, [0, 0]);
  });
});

describe('parsePaths', () => {
  test('reads a block list and strips quotes', () => {
    // Arrange
    const text = '---\npaths:\n  - \'**/*.mjs\'\n  - "tests/**"\n---\nbody';
    // Act
    const result = parsePaths(text);
    // Assert
    assert.deepEqual(result, ['**/*.mjs', 'tests/**']);
  });

  test('reads an inline list and keeps commas inside braces', () => {
    // Arrange
    const text = '---\npaths: [src/**/*.{ts,tsx}, docs/**]\n---\n';
    // Act
    const result = parsePaths(text);
    // Assert
    assert.deepEqual(result, ['src/**/*.{ts,tsx}', 'docs/**']);
  });

  test('returns an empty list without frontmatter', () => {
    // Arrange
    const text = '# Title\npaths:\n  - a\n';
    // Act
    const result = parsePaths(text);
    // Assert
    assert.deepEqual(result, []);
  });

  test('returns an empty list when frontmatter has no paths key', () => {
    // Arrange
    const text = '---\ndescription: x\n---\n- item\n';
    // Act
    const result = parsePaths(text);
    // Assert
    assert.deepEqual(result, []);
  });
});

describe('findImports', () => {
  test('finds relative imports at line start and after a space', () => {
    // Arrange
    const text = '@docs/a.md\nSee @b.md for more.';
    // Act
    const result = findImports(text);
    // Assert
    assert.deepEqual(result, ['docs/a.md', 'b.md']);
  });

  test('strips trailing punctuation', () => {
    // Arrange
    const text = 'Read @a.md, then @b.md.';
    // Act
    const result = findImports(text);
    // Assert
    assert.deepEqual(result, ['a.md', 'b.md']);
  });

  test('ignores code fences, code spans, home and absolute paths, and emails', () => {
    // Arrange
    const text = '```\n@fenced.md\n```\n`@span.md` @~/home.md @/abs.md me@mail.com';
    // Act
    const result = findImports(text);
    // Assert
    assert.deepEqual(result, []);
  });

  test('returns an empty list for text without imports', () => {
    // Arrange
    const text = 'plain text';
    // Act
    const result = findImports(text);
    // Assert
    assert.deepEqual(result, []);
  });
});

describe('matchesGlob', () => {
  test('matches ** across directories, including none', () => {
    // Arrange
    const files = ['a.mjs', 'x/y/b.mjs'];
    // Act
    const results = files.map((f) => matchesGlob(f, '**/*.mjs'));
    // Assert
    assert.deepEqual(results, [true, true]);
  });

  test('matches braces and a directory prefix', () => {
    // Arrange
    const glob = 'src/**/*.{ts,tsx}';
    // Act
    const results = ['src/a/b.tsx', 'src/c.ts'].map((f) => matchesGlob(f, glob));
    // Assert
    assert.deepEqual(results, [true, true]);
  });

  test('does not let * cross a directory or match another extension', () => {
    // Arrange
    const checks = [matchesGlob('a/b.mjs', '*.mjs'), matchesGlob('a.md', '**/*.mjs')];
    // Act
    const results = checks;
    // Assert
    assert.deepEqual(results, [false, false]);
  });

  test('treats regex metacharacters literally and rejects an unclosed brace', () => {
    // Arrange
    const checks = [matchesGlob('axjson', '.a?json'), matchesGlob('a.ts', 'a.{ts')];
    // Act
    const results = checks;
    // Assert
    assert.deepEqual(results, [false, false]);
  });
});

describe('countContext', () => {
  test('counts project files, unscoped rules, and imports, and reports glob matches', () => {
    // Arrange
    const files = {
      [at('CLAUDE.md')]: 'one\n\ntwo\n@extra.md\n',
      [at('extra.md')]: 'x\ny\n',
      [at('.claude', 'rules', 'always.md')]: 'a\nb\nc\n',
      [at('.claude', 'rules', 'scoped.md')]: '---\npaths:\n  - "**/*.mjs"\n---\nbody\n'
    };
    const deps = fsStub(files, { trackedFiles: () => ['a.mjs', 'b/c.mjs', 'd.md'] });
    // Act
    const result = countContext(ROOT, deps);
    // Assert
    assert.deepEqual(result.project, [
      { path: 'CLAUDE.md', lines: 3 },
      { path: '.claude/rules/always.md', lines: 3 },
      { path: 'extra.md', lines: 2 }
    ]);
    assert.deepEqual(result.rules, [{ file: '.claude/rules/scoped.md', globs: [{ glob: '**/*.mjs', matches: 2 }] }]);
    assert.equal(result.alwaysLoaded, '8 + 0');
  });

  test('counts an ancestor CLAUDE.md separately', () => {
    // Arrange
    const files = { [at('CLAUDE.md')]: 'a\n', [path.resolve('/stub', 'CLAUDE.md')]: 'p\nq\n' };
    // Act
    const result = countContext(ROOT, fsStub(files));
    // Assert
    assert.deepEqual(result.ancestors, [{ path: path.resolve('/stub', 'CLAUDE.md'), lines: 2 }]);
    assert.equal(result.alwaysLoaded, '1 + 2');
  });

  test('returns empty counts when the project has no memory files', () => {
    // Arrange
    const deps = fsStub({});
    // Act
    const result = countContext(ROOT, deps);
    // Assert
    assert.deepEqual(result.project, []);
    assert.deepEqual(result.rules, []);
    assert.equal(result.alwaysLoaded, '0 + 0');
  });

  test('skips imports outside the root, missing imports, cycles, and hops past the limit', () => {
    // Arrange
    const files = {
      [at('CLAUDE.md')]: '@../outside.md\n@missing.md\n@h1.md\n',
      [path.resolve('/stub', 'outside.md')]: 'secret\n',
      [at('h1.md')]: '@CLAUDE.md\n@h2.md\n',
      [at('h2.md')]: '@h3.md\n',
      [at('h3.md')]: '@h4.md\n',
      [at('h4.md')]: '@h5.md\n',
      [at('h5.md')]: 'too deep\n'
    };
    // Act
    const result = countContext(ROOT, fsStub(files));
    // Assert
    assert.deepEqual(
      result.project.map((f) => f.path),
      ['CLAUDE.md', 'h1.md', 'h2.md', 'h3.md', 'h4.md']
    );
  });

  test('does not read tracked files when no rule is path-scoped', () => {
    // Arrange
    const files = { [at('CLAUDE.md')]: 'a\n' };
    const deps = fsStub(files, {
      trackedFiles: () => {
        throw new Error('trackedFiles must not run');
      }
    });
    // Act
    const result = countContext(ROOT, deps);
    // Assert
    assert.deepEqual(result.rules, []);
  });
});

describe('main', () => {
  test('prints the JSON counts and returns 0', () => {
    // Arrange
    const logs = [];
    const deps = { ...fsStub({ [at('CLAUDE.md')]: 'a\n' }), log: (t) => logs.push(t), error: () => {} };
    // Act
    const code = main([ROOT], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(logs[0]).project[0].lines, 1);
  });

  test('accepts a different project directory', () => {
    // Arrange
    const other = path.resolve('/stub/other');
    const logs = [];
    const deps = { ...fsStub({ [path.join(other, 'CLAUDE.md')]: 'a\nb\n' }), log: (t) => logs.push(t) };
    // Act
    const code = main([other], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(logs[0]).root, other);
  });

  test('prints usage and returns 2 without exactly one argument', () => {
    // Arrange
    const errors = [];
    const deps = { ...fsStub({}), error: (t) => errors.push(t) };
    // Act
    const code = main([], deps);
    // Assert
    assert.equal(code, 2);
    assert.match(errors[0], /^usage:/);
  });

  test('returns 1 when the directory does not exist', () => {
    // Arrange
    const errors = [];
    const deps = { ...fsStub({}), error: (t) => errors.push(t), log: () => assert.fail('no stdout') };
    // Act
    const code = main([ROOT], deps);
    // Assert
    assert.equal(code, 1);
    assert.match(errors[0], /does not exist/);
  });
});
