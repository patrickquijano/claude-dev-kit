import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  globToRegExp,
  main,
  parseSections,
  staleSections
} from '../../../../../skills/update-editorconfig/scripts/stale-sections.mjs';

const CONFIG = `root = true

[*]
indent_size = 4

# Shell
[{*.sh,*.bash}]
indent_style = tab

[*.php]
indent_size = 4

[src/**.py]
indent_size = 4
`;
const FILES = ['a.sh', 'scripts/b.bash', 'src/x/y.py', 'README.md'];

describe('globToRegExp', () => {
  test('matches a single-star glob at any depth', () => {
    // Arrange
    const glob = '*.sh';
    // Act
    const re = globToRegExp(glob);
    // Assert
    assert.equal(re.test('a.sh'), true);
    assert.equal(re.test('dir/a.sh'), true);
  });

  test('expands a brace list', () => {
    // Arrange
    const glob = '{*.sh,Makefile}';
    // Act
    const re = globToRegExp(glob);
    // Assert
    assert.equal(re.test('Makefile'), true);
    assert.equal(re.test('x/run.sh'), true);
  });

  test('anchors a glob with a slash to the config directory', () => {
    // Arrange
    const glob = 'src/**.py';
    // Act
    const re = globToRegExp(glob);
    // Assert
    assert.equal(re.test('src/a/b.py'), true);
    assert.equal(re.test('lib/src/a.py'), false);
  });

  test('does not let a single star cross a slash', () => {
    // Arrange
    const glob = 'docs/*.md';
    // Act
    const re = globToRegExp(glob);
    // Assert
    assert.equal(re.test('docs/a/b.md'), false);
  });

  test('returns null for a numeric range', () => {
    // Arrange
    const glob = 'file{1..3}.txt';
    // Act
    const re = globToRegExp(glob);
    // Assert
    assert.equal(re, null);
  });
});

describe('parseSections', () => {
  test('lists headers with their lines and skips the preamble', () => {
    // Arrange
    const text = CONFIG;
    // Act
    const sections = parseSections(text);
    // Assert
    assert.deepEqual(
      sections.map((s) => s.glob),
      ['*', '{*.sh,*.bash}', '*.php', 'src/**.py']
    );
    assert.equal(sections[0].line, 3);
  });

  test('handles CRLF text', () => {
    // Arrange
    const text = '[*]\r\nindent_size = 2\r\n[*.md]\r\n';
    // Act
    const sections = parseSections(text);
    // Assert
    assert.equal(sections.length, 2);
  });

  test('ignores a commented header', () => {
    // Arrange
    const text = '# [*.php]\n; [*.py]\n[*.go]\n';
    // Act
    const sections = parseSections(text);
    // Assert
    assert.deepEqual(
      sections.map((s) => s.glob),
      ['*.go']
    );
  });

  test('returns nothing for a preamble-only file', () => {
    // Arrange
    const text = 'root = true\n';
    // Act
    const sections = parseSections(text);
    // Assert
    assert.deepEqual(sections, []);
  });
});

describe('staleSections', () => {
  test('flags a section no file matches', () => {
    // Arrange
    const files = FILES;
    // Act
    const result = staleSections(CONFIG, files);
    // Assert
    assert.deepEqual(
      result.filter((s) => s.stale).map((s) => s.glob),
      ['*.php']
    );
  });

  test('keeps a matching brace section and counts matches', () => {
    // Arrange
    const files = FILES;
    // Act
    const shell = staleSections(CONFIG, files).find((s) => s.glob === '{*.sh,*.bash}');
    // Assert
    assert.equal(shell.matches, 2);
    assert.equal(shell.stale, false);
  });

  test('never flags the catch-all', () => {
    // Arrange
    const files = [];
    // Act
    const base = staleSections('[*]\nindent_size = 4\n', files)[0];
    // Assert
    assert.equal(base.stale, false);
  });

  test('never flags an unsupported glob', () => {
    // Arrange
    const text = '[file{1..3}.txt]\n';
    // Act
    const [section] = staleSections(text, ['a.md']);
    // Assert
    assert.equal(section.stale, false);
    assert.equal(section.matches, null);
  });
});

describe('main', () => {
  const stub = (over = {}) => {
    const out = { logs: [], errors: [] };
    return {
      out,
      deps: {
        readFileSync: () => CONFIG,
        run: () => `${FILES.join('\n')}\n`,
        log: (t) => out.logs.push(t),
        error: (t) => out.errors.push(t),
        ...over
      }
    };
  };

  test('prints the stale globs and exits 0', () => {
    // Arrange
    const { out, deps } = stub();
    // Act
    const code = main(['--root', '/repo'], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(out.logs[0]).stale, ['*.php']);
  });

  test('lists files from git in the given root', () => {
    // Arrange
    const calls = [];
    const { deps } = stub({
      run: (file, args) => {
        calls.push([file, ...args]);
        return '';
      }
    });
    // Act
    main(['--root', '/repo'], deps);
    // Assert
    assert.deepEqual(calls[0], ['git', '-C', '/repo', 'ls-files', '--cached', '--others', '--exclude-standard']);
  });

  test('exits 2 without an absolute root', () => {
    // Arrange
    const { out, deps } = stub();
    // Act
    const code = main(['--root', 'relative'], deps);
    // Assert
    assert.equal(code, 2);
    assert.match(out.errors[0], /usage/);
  });

  test('reports a missing .editorconfig', () => {
    // Arrange
    const { out, deps } = stub({
      readFileSync: () => {
        throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      }
    });
    // Act
    const code = main(['--root', '/repo'], deps);
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(out.logs[0]).errors[0].code, 'no-editorconfig');
  });

  test('rethrows an unexpected read error', () => {
    // Arrange
    const { deps } = stub({
      readFileSync: () => {
        throw Object.assign(new Error('denied'), { code: 'EACCES' });
      }
    });
    // Act
    const act = () => main(['--root', '/repo'], deps);
    // Assert
    assert.throws(act, /denied/);
  });
});
