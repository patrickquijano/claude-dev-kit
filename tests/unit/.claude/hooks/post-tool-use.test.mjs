import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { findPinTests, main, plan, validate } from '../../../../.claude/hooks/post-tool-use.mjs';

const CWD = '/proj';
const ok = { status: 0, stdout: 'Validation passed', stderr: '' };

// Builds stub deps; `spawnResult` is what the stubbed `claude` returns.
function makeDeps({
  stdin = '',
  spawnResult = ok,
  platform = 'linux',
  realpath = (p) => p,
  tree = {},
  env = { CLAUDE_PROJECT_DIR: CWD, KEEP: 'yes' }
} = {}) {
  const calls = { spawn: [], stdout: [], stderr: [] };
  const deps = {
    spawn: (cmd, args, opts) => {
      calls.spawn.push({ cmd, args, opts });
      return spawnResult;
    },
    platform,
    env,
    realpath,
    readdir: (dir) => {
      if (!(dir in tree)) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      return Object.keys(tree[dir]).map((name) => ({ name, isDirectory: () => typeof tree[dir][name] === 'object' }));
    },
    readFile: (path) => {
      const dir = path.slice(0, path.lastIndexOf('/'));
      if (!(dir in tree)) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      return tree[dir][path.slice(dir.length + 1)];
    },
    readJsonStdin: async () => JSON.parse(stdin),
    stdout: (text) => calls.stdout.push(text),
    stderr: (text) => calls.stderr.push(text)
  };
  return { deps, calls };
}

const event = (file, session_id) => JSON.stringify({ tool_input: { file_path: file }, session_id });

describe('plan', () => {
  test('validates a plugin skill file', () => {
    // Arrange
    const file = `${CWD}/skills/x/SKILL.md`;
    // Act
    const result = plan(file, CWD);
    // Assert
    assert.equal(result.validate, true);
  });

  test('needs no validation when a project rule changes', () => {
    // Arrange
    const file = `${CWD}/.claude/rules/a.md`;
    // Act
    const result = plan(file, CWD);
    // Assert
    assert.equal(result.validate, false);
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

  test('accepts a file whose real path stays inside the project', () => {
    // Arrange
    const file = `${CWD}/skills/link.md`;
    const realpath = (p) => (p === file ? `${CWD}/skills/x/SKILL.md` : p);
    // Act
    const result = plan(file, CWD, realpath);
    // Assert
    assert.equal(result.rel, 'skills/x/SKILL.md');
  });

  test('returns null for a symlink whose target is outside the project', () => {
    // Arrange
    const file = `${CWD}/skills/link.md`;
    const realpath = (p) => (p === file ? '/outside/secret.md' : p);
    // Act
    const result = plan(file, CWD, realpath);
    // Assert
    assert.equal(result, null);
  });

  test('keeps the resolved path when the file does not exist', () => {
    // Arrange
    const file = `${CWD}/skills/gone.md`;
    const realpath = () => {
      throw Object.assign(new Error('missing'), { code: 'ENOENT' });
    };
    // Act
    const result = plan(file, CWD, realpath);
    // Assert
    assert.equal(result.rel, 'skills/gone.md');
  });

  test('rethrows a realpath error that is not ENOENT', () => {
    // Arrange
    const realpath = () => {
      throw Object.assign(new Error('denied'), { code: 'EACCES' });
    };
    // Act
    const act = () => plan(`${CWD}/skills/x.md`, CWD, realpath);
    // Assert
    assert.throws(act, /denied/);
  });

  for (const code of ['ELOOP', 'ENOTDIR']) {
    test(`rethrows a ${code} error from realpath`, () => {
      // Arrange
      const realpath = () => {
        throw Object.assign(new Error(code), { code });
      };
      // Act
      const act = () => plan(`${CWD}/skills/x.md`, CWD, realpath);
      // Assert
      assert.throws(act, { code });
    });
  }

  test('returns only the path and no validation for a non-plugin file', () => {
    // Arrange
    const file = `${CWD}/README.md`;
    // Act
    const result = plan(file, CWD);
    // Assert
    assert.deepEqual(result, { rel: 'README.md', validate: false });
  });
});

describe('plan pin', () => {
  test('names the skill for an edit under skills/<name>/', () => {
    // Arrange
    const file = `${CWD}/skills/x/references/a.md`;
    // Act
    const result = plan(file, CWD);
    // Assert
    assert.equal(result.pin, 'x');
  });

  test('names the agent for an edit to agents/<name>.md', () => {
    // Arrange
    const file = `${CWD}/agents/rubric-scorer.md`;
    // Act
    const result = plan(file, CWD);
    // Assert
    assert.equal(result.pin, 'rubric-scorer');
  });

  test('has no pin for a project rule', () => {
    // Arrange
    const file = `${CWD}/.claude/rules/a.md`;
    // Act
    const result = plan(file, CWD);
    // Assert
    assert.equal('pin' in result, false);
  });

  test('has no pin for a non-markdown file directly under agents', () => {
    // Arrange
    const file = `${CWD}/agents/notes.txt`;
    // Act
    const result = plan(file, CWD);
    // Assert
    assert.equal('pin' in result, false);
  });
});

describe('findPinTests', () => {
  const tree = {
    [`${CWD}/tests`]: {
      unit: {},
      'a.test.mjs': 'see skills/x/SKILL.md',
      'b.test.mjs': 'skills/x-other only',
      'c.txt': 'skills/x'
    },
    [`${CWD}/tests/unit`]: { 'd.test.mjs': 'agents/x.md' }
  };

  test('lists test files that mention the skill or agent, recursively', () => {
    // Arrange
    const { deps } = makeDeps({ tree });
    // Act
    const result = findPinTests(CWD, 'x', deps);
    // Assert
    assert.deepEqual(result, ['tests/a.test.mjs', 'tests/unit/d.test.mjs']);
  });

  test('skips a longer name sharing the prefix and non-test files', () => {
    // Arrange
    const { deps } = makeDeps({ tree });
    // Act
    const result = findPinTests(CWD, 'x-oth', deps);
    // Assert
    assert.deepEqual(result, []);
  });

  test('returns nothing when the tests directory is missing', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = findPinTests(CWD, 'x', deps);
    // Assert
    assert.deepEqual(result, []);
  });

  test('caps the list at 8 files', () => {
    // Arrange
    const files = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`t${i}.test.mjs`, 'skills/x']));
    const { deps } = makeDeps({ tree: { [`${CWD}/tests`]: files } });
    // Act
    const result = findPinTests(CWD, 'x', deps);
    // Assert
    assert.equal(result.length, 8);
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

  test('returns null when exit is 0 even if output mentions a warning', () => {
    // Arrange
    const stdout = '⚠ Found 1 plugin directory warning: ICON_MISSING\n✔ Validation passed';
    const { deps } = makeDeps({ spawnResult: { status: 0, stdout, stderr: '' } });
    // Act
    const result = validate(CWD, deps);
    // Assert
    assert.equal(result, null);
  });

  test('returns a report when --strict exits 1 on a warning', () => {
    // Arrange
    const { deps } = makeDeps({ spawnResult: { status: 1, stdout: 'Warning: long description', stderr: '' } });
    // Act
    const result = validate(CWD, deps);
    // Assert
    assert.match(result, /Warning: long description/);
  });

  test('names the spawn error when claude cannot run', () => {
    // Arrange
    const { deps } = makeDeps({
      spawnResult: { status: null, signal: 'SIGTERM', error: new Error('spawn claude ENOENT') }
    });
    // Act
    const result = validate(CWD, deps);
    // Assert
    assert.equal(result, 'claude CLI could not run: spawn claude ENOENT');
  });

  test('reports a timeout, not a CLI that could not run, on ETIMEDOUT', () => {
    // Arrange
    const error = Object.assign(new Error('spawnSync claude ETIMEDOUT'), { code: 'ETIMEDOUT' });
    const { deps } = makeDeps({ spawnResult: { status: null, signal: 'SIGTERM', error } });
    // Act
    const result = validate(CWD, deps);
    // Assert
    assert.equal(result, 'claude plugin validate --strict . timed out after 100 s');
  });

  test('reports the exit status, not a CLI error, for a normal failure', () => {
    // Arrange
    const { deps } = makeDeps({ spawnResult: { status: 3, stdout: 'bad', stderr: '' } });
    // Act
    const result = validate(CWD, deps);
    // Assert
    assert.match(result, /^claude plugin validate --strict \. failed \(exit 3\):\nbad\n/);
  });

  test('reports the signal when claude is killed with no spawn error', () => {
    // Arrange
    const { deps } = makeDeps({ spawnResult: { status: null, signal: 'SIGKILL', stdout: '', stderr: '' } });
    // Act
    const result = validate(CWD, deps);
    // Assert
    assert.match(result, /failed \(exit SIGKILL\)/);
  });
});

describe('main', () => {
  test('prints no message for a valid plugin skill edit', async () => {
    // Arrange
    const { deps, calls } = makeDeps({ stdin: event(`${CWD}/skills/x/SKILL.md`) });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(calls.spawn.length, 1);
    assert.deepEqual(calls.stdout, []);
  });

  test('prints the pin-test advice after a valid skill edit', async () => {
    // Arrange
    const tree = { [`${CWD}/tests`]: { 'a.test.mjs': 'skills/x' } };
    const { deps, calls } = makeDeps({ stdin: event(`${CWD}/skills/x/SKILL.md`), tree });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(calls.stdout.length, 1);
    assert.match(JSON.parse(calls.stdout[0]).hookSpecificOutput.additionalContext, /tests\/a\.test\.mjs/);
  });

  test('prints no pin advice when validation fails', async () => {
    // Arrange
    const tree = { [`${CWD}/tests`]: { 'a.test.mjs': 'skills/x' } };
    const { deps, calls } = makeDeps({
      stdin: event(`${CWD}/skills/x/SKILL.md`),
      spawnResult: { status: 1, stdout: 'broken', stderr: '' },
      tree
    });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 2);
    assert.equal(calls.stdout.length, 0);
  });

  test('prints nothing for a project rule edit', async () => {
    // Arrange
    const { deps, calls } = makeDeps({ stdin: event(`${CWD}/.claude/rules/a.md`, 's1') });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(calls.spawn.length, 0);
    assert.equal(calls.stdout.length, 0);
  });

  test('prints no notice for a new project skill', async () => {
    // Arrange
    const stdin = JSON.stringify({
      tool_input: { file_path: `${CWD}/.claude/skills/n/SKILL.md` },
      tool_response: { type: 'create' },
      session_id: 's1'
    });
    const { deps, calls } = makeDeps({ stdin });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(calls.stdout, []);
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

  test('uses the event cwd when CLAUDE_PROJECT_DIR is unset', async () => {
    // Arrange
    const stdin = JSON.stringify({ cwd: '/other', tool_input: { file_path: '/other/skills/x/SKILL.md' } });
    const { deps, calls } = makeDeps({ stdin, env: {} });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(calls.spawn.length, 1);
    assert.equal(calls.spawn[0].opts.cwd, '/other');
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

  test('fails fast when the project directory does not exist', async () => {
    // Arrange
    const realpath = () => {
      throw Object.assign(new Error('ENOENT: no such directory'), { code: 'ENOENT' });
    };
    const { deps, calls } = makeDeps({ stdin: event(`${CWD}/skills/x/SKILL.md`), realpath });
    // Act
    const act = main(deps);
    // Assert
    await assert.rejects(act, /ENOENT/);
    assert.equal(calls.spawn.length, 0);
  });

  test('prints nothing for a symlink that points outside the project', async () => {
    // Arrange
    const link = `${CWD}/skills/link.md`;
    const realpath = (p) => (p === link ? '/outside/x.md' : p);
    const { deps, calls } = makeDeps({ stdin: event(link), realpath });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(calls.stdout.length + calls.spawn.length, 0);
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
