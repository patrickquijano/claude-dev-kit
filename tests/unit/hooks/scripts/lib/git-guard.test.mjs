import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { classify, decide } from '../../../../../hooks/scripts/lib/git-guard.mjs';

const ctx = (over = {}) => ({ branch: 'feat/x', defaultBranch: 'main', shipRelease: false, ci: false, ...over });
const verdict = (command, over) => classify(command, ctx(over)).decision;

describe('classify: block', () => {
  const blocked = [
    'git push --force',
    'git push -f origin feat/x',
    'git push -fu origin feat/x',
    'git push origin +feat/x',
    'git push --force-with-lease=main:abc123 origin main',
    'git push --force-with-lease=main:abc123 origin HEAD:main',
    'git commit --no-verify -m x',
    'git commit -n -m x',
    'git commit -nm x',
    'git push --no-verify',
    'git merge --no-verify topic',
    'HUSKY=0 git commit -m x',
    'git push --delete origin main',
    'git push origin :main',
    'git branch -D main',
    'git branch -d main',
    'claude plugin eval .',
    'git status && git push --force'
  ];
  for (const command of blocked)
    test(`blocks ${command}`, () => {
      // Arrange / Act
      const result = classify(command, ctx());
      // Assert
      assert.equal(result.decision, 'block');
      assert.match(result.reason, /^git-guard: /);
    });

  test('blocks gh pr merge --admin during ship-release', () => {
    // Arrange / Act / Assert
    assert.equal(verdict('gh pr merge 3 --admin', { shipRelease: true }), 'block');
  });

  test('a block wins over an earlier ask in the same line', () => {
    // Arrange / Act / Assert
    assert.equal(verdict('git reset --hard && git push -f', {}), 'block');
  });
});

describe('classify: ask', () => {
  const asked = [
    'git push --force-with-lease origin feat/x',
    'git push origin main',
    'git push',
    'git reset --hard HEAD~1',
    'git clean -fd',
    'git branch -D other',
    'gh pr merge 3 --admin'
  ];
  for (const command of asked)
    test(`asks on ${command}`, () => {
      // Arrange
      const over = command === 'git push' ? { branch: 'main' } : {};
      // Act
      const result = classify(command, ctx(over));
      // Assert
      assert.equal(result.decision, 'ask');
    });

  test('asks on a commit on the default branch', () => {
    // Arrange / Act / Assert
    assert.equal(verdict('git commit -m x', { branch: 'main' }), 'ask');
  });
});

describe('classify: allow', () => {
  const allowed = [
    'git status',
    'git push origin v1.0.0',
    'git push --tags',
    'git push origin refs/tags/v1.0.0',
    'git push -u origin feat/x',
    'git push --force-with-lease=feat/x:abc123 origin feat/x',
    'git commit -m "fix: -n and --no-verify in text"',
    'git commit -m x',
    'git branch -d feat/old',
    'git clean -nfd',
    'git -C /tmp/repo log --oneline',
    'gh pr list',
    'gh pr merge 3 --squash',
    'echo "git push --force"',
    'HUSKY=0 git commit -m x'
  ];
  for (const command of allowed)
    test(`allows ${command}`, () => {
      // Arrange
      const over = command.startsWith('HUSKY') ? { ci: true } : {};
      // Act
      const result = classify(command, ctx(over));
      // Assert
      assert.equal(result.decision, null);
    });
});

describe('decide', () => {
  const run = (answers) => (cwd, args) => {
    const key = args.join(' ');
    const hit = answers[key];
    return hit === undefined ? { status: 1, stdout: Buffer.from('') } : { status: 0, stdout: Buffer.from(hit) };
  };
  const base = {
    'branch --show-current': 'main\n',
    'symbolic-ref --short refs/remotes/origin/HEAD': 'origin/main\n'
  };
  const event = (command, tool_name = 'Bash') => ({ tool_name, tool_input: { command }, cwd: '/repo' });

  test('asks on a commit while on the default branch from origin/HEAD', () => {
    // Arrange
    const deps = { git: run(base), existsSync: () => false, env: {} };
    // Act
    const result = decide(event('git commit -m x'), deps);
    // Assert
    assert.equal(result.decision, 'ask');
  });

  test('blocks gh pr merge --admin when the ship-release marker exists', () => {
    // Arrange
    const deps = {
      git: run({ ...base, 'rev-parse --git-path cdk-ship-release': '.git/cdk-ship-release\n' }),
      existsSync: () => true,
      env: {}
    };
    // Act
    const result = decide(event('gh pr merge 1 --admin'), deps);
    // Assert
    assert.equal(result.decision, 'block');
  });

  test('falls back to master when origin/HEAD is unset', () => {
    // Arrange
    const deps = {
      git: run({ 'branch --show-current': 'master\n', 'rev-parse --verify --quiet refs/heads/master': 'x\n' }),
      existsSync: () => false,
      env: {}
    };
    // Act
    const result = decide(event('git push'), deps);
    // Assert
    assert.equal(result.decision, 'ask');
  });

  test('lets HUSKY=0 through when CI is set', () => {
    // Arrange
    const deps = { git: run(base), existsSync: () => false, env: { CI: 'true' } };
    // Act
    const result = decide(event('HUSKY=0 git status'), deps);
    // Assert
    assert.equal(result.decision, null);
  });

  test('ignores tools other than Bash', () => {
    // Arrange
    const deps = { git: run(base), existsSync: () => false, env: {} };
    // Act
    const result = decide(event('git push --force', 'Write'), deps);
    // Assert
    assert.equal(result.decision, null);
  });

  test('ignores commands that name no git, gh, or claude', () => {
    // Arrange
    const deps = {
      git: () => {
        throw new Error('must not run git');
      },
      env: {}
    };
    // Act
    const result = decide(event('ls -la'), deps);
    // Assert
    assert.equal(result.decision, null);
  });
});
