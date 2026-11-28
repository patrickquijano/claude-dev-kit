import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { commitHeader, headerLimit, main, violations } from '../../../../.claude/hooks/pre-tool-use.mjs';

const CWD = '/proj';
const RC = JSON.stringify({ rules: { 'header-max-length': [2, 'always', 72] } });
const LONG = `feat: ${'a'.repeat(70)}`;

// Builds stub deps; `files` maps a path to its text, and a missing path throws ENOENT.
function makeDeps({ stdin = '{}', files = { [`${CWD}/.commitlintrc.json`]: RC } } = {}) {
  const calls = { stderr: [] };
  const deps = {
    env: { CLAUDE_PROJECT_DIR: CWD },
    realpath: (p) => p,
    readFile: (path) => {
      if (path in files) return files[path];
      throw Object.assign(new Error('missing'), { code: 'ENOENT' });
    },
    readJsonStdin: async () => JSON.parse(stdin),
    stderr: (text) => calls.stderr.push(text)
  };
  return { deps, calls };
}

const bash = (command) => JSON.stringify({ tool_name: 'Bash', tool_input: { command } });

describe('headerLimit', () => {
  test('returns the configured header-max-length', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = headerLimit(CWD, deps);
    // Assert
    assert.equal(result, 72);
  });

  test('reads a limit other than 72', () => {
    // Arrange
    const { deps } = makeDeps({
      files: { [`${CWD}/.commitlintrc.json`]: JSON.stringify({ rules: { 'header-max-length': [2, 'always', 50] } }) }
    });
    // Act
    const result = headerLimit(CWD, deps);
    // Assert
    assert.equal(result, 50);
  });

  test('returns null when the file is missing', () => {
    // Arrange
    const { deps } = makeDeps({ files: {} });
    // Act
    const result = headerLimit(CWD, deps);
    // Assert
    assert.equal(result, null);
  });

  test('returns null when the rule is absent', () => {
    // Arrange
    const { deps } = makeDeps({ files: { [`${CWD}/.commitlintrc.json`]: '{"rules":{}}' } });
    // Act
    const result = headerLimit(CWD, deps);
    // Assert
    assert.equal(result, null);
  });

  test('rethrows a read error that is not ENOENT', () => {
    // Arrange
    const { deps } = makeDeps();
    deps.readFile = () => {
      throw Object.assign(new Error('denied'), { code: 'EACCES' });
    };
    // Act
    const act = () => headerLimit(CWD, deps);
    // Assert
    assert.throws(act, /denied/);
  });
});

describe('commitHeader', () => {
  test('reads a double-quoted -m value', () => {
    // Arrange
    const command = 'git commit -m "feat: add x"';
    // Act
    const result = commitHeader(command);
    // Assert
    assert.equal(result, 'feat: add x');
  });

  test('reads a single-quoted --message value', () => {
    // Arrange
    const command = "git commit --message 'fix: y'";
    // Act
    const result = commitHeader(command);
    // Assert
    assert.equal(result, 'fix: y');
  });

  test('reads the first line of a heredoc message', () => {
    // Arrange
    const command = 'git commit -m "$(cat <<\'EOF\'\nfeat: from heredoc\n\nbody\nEOF\n)"';
    // Act
    const result = commitHeader(command);
    // Assert
    assert.equal(result, 'feat: from heredoc');
  });

  test('reads the value of a combined -am flag', () => {
    // Arrange
    const command = 'git commit -am "chore: z"';
    // Act
    const result = commitHeader(command);
    // Assert
    assert.equal(result, 'chore: z');
  });

  test('returns null when there is no message flag', () => {
    // Arrange
    const command = 'git commit';
    // Act
    const result = commitHeader(command);
    // Assert
    assert.equal(result, null);
  });

  test('returns null for an unterminated quote', () => {
    // Arrange
    const command = 'git commit -m "feat: oops';
    // Act
    const result = commitHeader(command);
    // Assert
    assert.equal(result, null);
  });
});

describe('violations', () => {
  test('flags a header over the limit', () => {
    // Arrange
    const command = `git commit -m "${LONG}"`;
    // Act
    const result = violations(command, 72);
    // Assert
    assert.deepEqual(result, ['commit header is 76 chars, max 72']);
  });

  test('flags the hook, signing, and HUSKY bypasses', () => {
    // Arrange
    const command = 'HUSKY=0 git commit --no-verify --no-gpg-sign -m "fix: a"';
    // Act
    const result = violations(command, 72);
    // Assert
    assert.deepEqual(result, ['--no-verify is forbidden', '--no-gpg-sign is forbidden', 'HUSKY=0 is forbidden']);
  });

  test('allows a header within the limit', () => {
    // Arrange
    const command = 'git commit -m "feat: short"';
    // Act
    const result = violations(command, 72);
    // Assert
    assert.deepEqual(result, []);
  });

  test('ignores a command that is not git commit', () => {
    // Arrange
    const command = `echo --no-verify "${LONG}"`;
    // Act
    const result = violations(command, 72);
    // Assert
    assert.deepEqual(result, []);
  });

  test('allows an unparseable message', () => {
    // Arrange
    const command = 'git commit -m "feat: unterminated';
    // Act
    const result = violations(command, 72);
    // Assert
    assert.deepEqual(result, []);
  });

  test('skips the length check when no limit is configured', () => {
    // Arrange
    const command = `git commit -m "${LONG}"`;
    // Act
    const result = violations(command, null);
    // Assert
    assert.deepEqual(result, []);
  });
});

describe('main', () => {
  test('returns 2 with one stderr line for an over-long header', async () => {
    // Arrange
    const { deps, calls } = makeDeps({ stdin: bash(`git commit -m "${LONG}"`) });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 2);
    assert.equal(calls.stderr.length, 1);
    assert.match(calls.stderr[0], /76 chars, max 72/);
  });

  test('returns 2 for a hook bypass flag', async () => {
    // Arrange
    const { deps, calls } = makeDeps({ stdin: bash('git commit --no-verify -m "fix: a"') });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 2);
    assert.match(calls.stderr[0], /--no-verify/);
  });

  test('returns 0 for a valid commit', async () => {
    // Arrange
    const { deps, calls } = makeDeps({ stdin: bash('git commit -m "fix: ok"') });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(calls.stderr, []);
  });

  test('returns 0 for a non-commit Bash command', async () => {
    // Arrange
    const { deps } = makeDeps({ stdin: bash('git status') });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
  });

  test('returns 0 for a different tool', async () => {
    // Arrange
    const stdin = JSON.stringify({ tool_name: 'Edit', tool_input: { command: `git commit -m "${LONG}"` } });
    const { deps } = makeDeps({ stdin });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
  });
});
