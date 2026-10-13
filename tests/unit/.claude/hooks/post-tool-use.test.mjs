import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isProjectScoped, main, parseEvent, plan, validate } from '../../../../.claude/hooks/post-tool-use.mjs';

const CWD = '/proj';
const ok = { status: 0, stdout: 'Validation passed', stderr: '' };

// Builds stub deps; `spawnResult` is what the stubbed `claude` returns.
function makeDeps({ stdin = '', spawnResult = ok, platform = 'linux' } = {}) {
  const calls = { spawn: [], stdout: [], stderr: [] };
  const deps = {
    spawn: (cmd, args, opts) => {
      calls.spawn.push({ cmd, args, opts });
      return spawnResult;
    },
    platform,
    env: { CLAUDE_PROJECT_DIR: CWD, KEEP: 'yes' },
    readStdin: async () => stdin,
    stdout: (text) => calls.stdout.push(text),
    stderr: (text) => calls.stderr.push(text)
  };
  return { deps, calls };
}

const event = (file) => JSON.stringify({ tool_input: { file_path: file } });

describe('isProjectScoped', () => {
  test('returns true for a rule file under .claude/rules', () => {
    // Arrange
    const parts = ['.claude', 'rules', 'git.md'];
    // Act
    const result = isProjectScoped(parts);
    // Assert
    assert.equal(result, true);
  });

  test('returns true for .claude/settings.json', () => {
    // Arrange
    const parts = ['.claude', 'settings.json'];
    // Act
    const result = isProjectScoped(parts);
    // Assert
    assert.equal(result, true);
  });

  test('returns false for a path outside .claude', () => {
    // Arrange
    const parts = ['skills', 'a', 'SKILL.md'];
    // Act
    const result = isProjectScoped(parts);
    // Assert
    assert.equal(result, false);
  });

  test('returns false for an unlisted file directly under .claude', () => {
    // Arrange
    const parts = ['.claude', 'notes.md'];
    // Act
    const result = isProjectScoped(parts);
    // Assert
    assert.equal(result, false);
  });
});

describe('parseEvent', () => {
  test('returns the parsed object for valid JSON', () => {
    // Arrange
    const data = '{"a":1}';
    // Act
    const result = parseEvent(data);
    // Assert
    assert.deepEqual(result, { a: 1 });
  });

  test('throws for JSON null', () => {
    // Arrange
    const data = 'null';
    // Act
    const act = () => parseEvent(data);
    // Assert
    assert.throws(act);
  });

  test('throws for empty input', () => {
    // Arrange
    const data = '';
    // Act
    const act = () => parseEvent(data);
    // Assert
    assert.throws(act, SyntaxError);
  });

  test('throws for invalid JSON', () => {
    // Arrange
    const data = '{nope';
    // Act
    const act = () => parseEvent(data);
    // Assert
    assert.throws(act);
  });

  test('throws for a JSON array', () => {
    // Arrange
    const data = '[1,2]';
    // Act
    const act = () => parseEvent(data);
    // Assert
    assert.throws(act);
  });
});

describe('plan', () => {
  test('validates and asks for a plugin reload when a skill file changes', () => {
    // Arrange
    const file = `${CWD}/skills/x/SKILL.md`;
    // Act
    const result = plan(file, CWD);
    // Assert
    assert.equal(result.validate, true);
    assert.match(result.notice.systemMessage, /\/reload-plugins, then \/compact/);
    assert.equal(result.notice.hookSpecificOutput, undefined);
  });

  test('asks for /reload-skills and re-reading when a project rule changes', () => {
    // Arrange
    const file = `${CWD}/.claude/rules/a.md`;
    // Act
    const result = plan(file, CWD);
    // Assert
    assert.equal(result.validate, false);
    assert.match(result.notice.systemMessage, /\/reload-skills/);
    assert.equal(result.notice.hookSpecificOutput.hookEventName, 'PostToolUse');
  });

  test('returns null for a file outside the project', () => {
    // Arrange
    const file = '/elsewhere/skills/x.md';
    // Act
    const result = plan(file, CWD);
    // Assert
    assert.equal(result, null);
  });

  test('returns null when the path is not a string', () => {
    // Arrange
    const file = undefined;
    // Act
    const result = plan(file, CWD);
    // Assert
    assert.equal(result, null);
  });

  test('returns no notice for a path that needs no reload', () => {
    // Arrange
    const file = `${CWD}/README.md`;
    // Act
    const result = plan(file, CWD);
    // Assert
    assert.deepEqual(result, { rel: 'README.md', validate: false, notice: null });
  });
});

describe('validate', () => {
  test('returns null when claude exits 0 with no warning', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = validate(CWD, deps);
    // Assert
    assert.equal(result, null);
  });

  test('runs claude with fixed args, NO_COLOR, and the caller env', () => {
    // Arrange
    const { deps, calls } = makeDeps();
    // Act
    validate(CWD, deps);
    // Assert
    assert.deepEqual(calls.spawn[0].args, ['plugin', 'validate', '--strict', '.']);
    assert.equal(calls.spawn[0].opts.env.NO_COLOR, '1');
    assert.equal(calls.spawn[0].opts.env.KEEP, 'yes');
  });

  test('returns a report when claude exits non-zero', () => {
    // Arrange
    const { deps } = makeDeps({ spawnResult: { status: 1, stdout: 'bad frontmatter', stderr: '' } });
    // Act
    const result = validate(CWD, deps);
    // Assert
    assert.match(result, /failed \(exit 1\):\nbad frontmatter/);
  });

  test('returns a report when exit is 0 but output has a warning', () => {
    // Arrange
    const { deps } = makeDeps({ spawnResult: { status: 0, stdout: 'Warning: long description', stderr: '' } });
    // Act
    const result = validate(CWD, deps);
    // Assert
    assert.match(result, /Warning: long description/);
  });

  test('reports the signal and spawn error when claude cannot run', () => {
    // Arrange
    const { deps } = makeDeps({ spawnResult: { status: null, signal: 'SIGTERM', error: new Error('ENOENT') } });
    // Act
    const result = validate(CWD, deps);
    // Assert
    assert.match(result, /exit SIGTERM\):\nENOENT/);
  });
});

describe('main', () => {
  test('prints the reload notice and returns 0 for a valid plugin edit', async () => {
    // Arrange
    const { deps, calls } = makeDeps({ stdin: event(`${CWD}/skills/x/SKILL.md`) });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.match(JSON.parse(calls.stdout[0]).systemMessage, /\/reload-plugins/);
  });

  test('prints a notice without validating for a project rule edit', async () => {
    // Arrange
    const { deps, calls } = makeDeps({ stdin: event(`${CWD}/.claude/rules/a.md`) });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(calls.spawn.length, 0);
    assert.equal(calls.stdout.length, 1);
  });

  test('returns 2, writes the report to stderr, and prints no notice when validation fails', async () => {
    // Arrange
    const { deps, calls } = makeDeps({
      stdin: event(`${CWD}/skills/x/SKILL.md`),
      spawnResult: { status: 1, stdout: 'broken', stderr: '' }
    });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 2);
    assert.match(calls.stderr[0], /broken/);
    assert.equal(calls.stdout.length, 0);
  });

  test('prints nothing for input without a file path', async () => {
    // Arrange
    const { deps, calls } = makeDeps({ stdin: '{}' });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(calls.stdout.length + calls.stderr.length + calls.spawn.length, 0);
  });

  test('prints nothing for a path outside the project', async () => {
    // Arrange
    const { deps, calls } = makeDeps({ stdin: event('/elsewhere/skills/x.md') });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(calls.stdout.length + calls.spawn.length, 0);
  });
});
