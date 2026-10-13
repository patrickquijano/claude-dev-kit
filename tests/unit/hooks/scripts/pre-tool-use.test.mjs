import assert from 'node:assert/strict';
import { test } from 'node:test';
import { main } from '../../../../hooks/scripts/pre-tool-use.mjs';

test('main: rejects when stdin is not a JSON object', async () => {
  // Arrange
  const deps = {
    readJsonStdin: async () => {
      throw new TypeError('hook input is not a JSON object');
    }
  };
  // Act
  const act = main(deps);
  // Assert
  await assert.rejects(act, TypeError);
});

test('main: resolves 0 when the project has no release policy', async () => {
  // Arrange
  const deps = {
    readJsonStdin: async () => ({ tool_name: 'Bash', tool_input: { command: 'gh pr create' } }),
    env: {},
    cwd: () => '/nowhere',
    existsSync: () => false,
    readFileSync: () => {
      throw new Error('ENOENT');
    },
    git: () => ({ status: 128, stdout: Buffer.from('') })
  };
  // Act
  const code = await main(deps);
  // Assert
  assert.equal(code, 0);
});

test('main: resolves 0 for a command that does not create a PR or MR', async () => {
  // Arrange
  const deps = {
    readJsonStdin: async () => ({ tool_name: 'Bash', tool_input: { command: 'gh pr list' }, cwd: '/nowhere' }),
    existsSync: () => false,
    git: () => ({ status: 128, stdout: Buffer.from('') })
  };
  // Act
  const code = await main(deps);
  // Assert
  assert.equal(code, 0);
});

test('main: resolves 2 and writes the reason when the policy file is invalid', async () => {
  // Arrange
  const errors = [];
  const deps = {
    readJsonStdin: async () => ({ tool_name: 'Bash', tool_input: { command: 'gh pr create' }, cwd: '/p' }),
    existsSync: () => true,
    readFileSync: () => 'not json',
    git: () => ({ status: 0, stdout: Buffer.from('/p\n') }),
    stderr: (t) => errors.push(t)
  };
  // Act
  const code = await main(deps);
  // Assert
  assert.equal(code, 2);
  assert.match(errors.join(''), /invalid/);
});

const gitStub = (branch) => (cwd, args) => {
  const key = args.join(' ');
  if (key === 'branch --show-current') return { status: 0, stdout: Buffer.from(`${branch}\n`) };
  if (key.startsWith('symbolic-ref')) return { status: 0, stdout: Buffer.from('origin/main\n') };
  return { status: 128, stdout: Buffer.from('') };
};

test('main: resolves 2 and names the rule when the guard blocks', async () => {
  // Arrange
  const errors = [];
  const deps = {
    readJsonStdin: async () => ({ tool_name: 'Bash', tool_input: { command: 'git push --force' }, cwd: '/p' }),
    existsSync: () => false,
    git: gitStub('feat/x'),
    env: {},
    stderr: (t) => errors.push(t)
  };
  // Act
  const code = await main(deps);
  // Assert
  assert.equal(code, 2);
  assert.match(errors.join(''), /^git-guard: force push is forbidden/);
});

test('main: prints the ask JSON and resolves 0 when the guard asks', async () => {
  // Arrange
  const printed = [];
  const deps = {
    readJsonStdin: async () => ({ tool_name: 'Bash', tool_input: { command: 'git reset --hard' }, cwd: '/p' }),
    existsSync: () => false,
    git: gitStub('feat/x'),
    env: {},
    stdout: (t) => printed.push(t)
  };
  // Act
  const code = await main(deps);
  // Assert
  assert.equal(code, 0);
  const out = JSON.parse(printed.join(''));
  assert.equal(out.hookSpecificOutput.permissionDecision, 'ask');
  assert.equal(out.hookSpecificOutput.hookEventName, 'PreToolUse');
});

test('main: prints nothing for a command the guard allows', async () => {
  // Arrange
  const printed = [];
  const deps = {
    readJsonStdin: async () => ({ tool_name: 'Bash', tool_input: { command: 'git status' }, cwd: '/p' }),
    existsSync: () => false,
    git: gitStub('feat/x'),
    env: {},
    stdout: (t) => printed.push(t)
  };
  // Act
  const code = await main(deps);
  // Assert
  assert.equal(code, 0);
  assert.deepEqual(printed, []);
});

test('main: the release check still blocks and suppresses the ask', async () => {
  // Arrange
  const printed = [];
  const deps = {
    readJsonStdin: async () => ({
      tool_name: 'Bash',
      tool_input: { command: 'git reset --hard && gh pr create' },
      cwd: '/p'
    }),
    existsSync: () => true,
    readFileSync: () => 'not json',
    git: gitStub('feat/x'),
    env: {},
    stderr: () => {},
    stdout: (t) => printed.push(t)
  };
  // Act
  const code = await main(deps);
  // Assert
  assert.equal(code, 2);
  assert.deepEqual(printed, []);
});
