import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide, output } from '../../../../../hooks/scripts/lib/task-end.mjs';

function make({
  configured = false,
  present = false,
  inside = true,
  marker = false,
  unsafe = false,
  badCwd = false
} = {}) {
  return {
    env: { CLAUDE_PROJECT_DIR: '/repo' },
    cwd: () => '/cwd',
    realpathSync: (p) => {
      if (badCwd) throw new Error('ENOENT');
      return p;
    },
    graphifyConfigured: () => configured,
    graphifyFilesExist: () => present,
    git: (cwd, args) => {
      if (args[0] === 'rev-parse' && args[1] === '--is-inside-work-tree') {
        return { status: inside ? 0 : 128, stdout: Buffer.from('true\n') };
      }
      return { status: 0, stdout: Buffer.from('.git/cdk-ship-release\n') };
    },
    existsSync: () => marker,
    unsafeState: () => unsafe
  };
}
const prompt = { prompt: 'Fix the bug' };

test('decide asks for the commit step in a git repo', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(result.length, 2);
  assert.match(result[1], /cdk:commit-changes/);
});

test('decide scopes the commit step to the paths this task changed', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[1], /paths: <the files this task created, edited, or deleted>/);
});

test('decide tells Claude to skip the commit step when this task changed no files', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[1], /changed no files, skip this step/);
});

test('decide does not tell Claude to commit every dirty file', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.doesNotMatch(result[1], /If this task changed files,/);
});

test('decide runs graphify update before the commit when the graph exists', () => {
  // Arrange
  const deps = make({ configured: true, present: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[0], /graphify update \./);
  assert.match(result[2], /cdk:commit-changes/);
});

test('decide asks for the graphify skill when the graph is missing', () => {
  // Arrange
  const deps = make({ configured: true, present: false });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[0], /`graphify` skill with the argument `\.`/);
});

test('decide omits the Graphify step when Graphify is not configured', () => {
  // Arrange
  const deps = make({ configured: false, present: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(
    result.some((p) => /graphify/i.test(p)),
    false
  );
});

test('decide returns nothing for a question prompt', () => {
  // Arrange
  const deps = make({ configured: true, present: true });
  // Act
  const result = decide({ prompt: 'What does stop.mjs do?' }, deps);
  // Assert
  assert.deepEqual(result, []);
});

test('decide still adds the steps for a change prompt with a #plan override', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide({ prompt: 'Why is it slow? #plan' }, deps);
  // Assert
  assert.equal(result.length, 2);
});

test('decide makes every step conditional on git status', () => {
  // Arrange
  const deps = make({ configured: true, present: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(result.length, 3);
  for (const step of result) assert.match(step, /git status --porcelain/);
});

test('decide limits the Graphify step to code changes', () => {
  // Arrange
  const deps = make({ configured: true, present: false });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[0], /changed code files \(not only docs or config\)/);
});

test('decide skips slash-command prompts', () => {
  // Arrange
  const deps = make({ configured: true });
  // Act
  const result = decide({ prompt: '/cdk:ship-release' }, deps);
  // Assert
  assert.deepEqual(result, []);
});

test('decide skips bang prompts', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide({ prompt: '  !ls' }, deps);
  // Assert
  assert.deepEqual(result, []);
});

test('decide skips a missing or blank prompt', () => {
  // Arrange
  const deps = make();
  // Act
  const results = [decide({}, deps), decide({ prompt: '   ' }, deps), decide(null, deps)];
  // Assert
  assert.deepEqual(results, [[], [], []]);
});

test('decide omits the commit step while the ship-release marker exists', () => {
  // Arrange
  const deps = make({ marker: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.deepEqual(result, []);
});

test('decide omits the commit step in an unsafe git state', () => {
  // Arrange
  const deps = make({ unsafe: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.deepEqual(result, []);
});

test('decide omits the commit step outside a git repo but keeps Graphify', () => {
  // Arrange
  const deps = make({ inside: false, configured: true, present: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(result.length, 1);
  assert.match(result[0], /graphify update/);
});

test('decide lets a project dir error bubble', () => {
  // Arrange
  const deps = make({ badCwd: true, configured: true });
  // Act
  const act = () => decide(prompt, deps);
  // Assert
  assert.throws(act, /ENOENT/);
});

test('output numbers the steps under the end-of-task heading', () => {
  // Arrange
  const parts = ['one', 'two'];
  // Act
  const result = output(parts);
  // Assert
  assert.equal(result.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(result.hookSpecificOutput.additionalContext, /^After the whole task is complete.*:\n1\. one\n2\. two$/);
});

test('output has no systemMessage so normal prompts stay quiet', () => {
  // Arrange
  const parts = ['one'];
  // Act
  const result = output(parts);
  // Assert
  assert.equal('systemMessage' in result, false);
});

test('output is null when there are no steps', () => {
  // Arrange
  const parts = [];
  // Act
  const result = output(parts);
  // Assert
  assert.equal(result, null);
});

test('decide puts the docs step between Graphify and the commit step', () => {
  // Arrange
  const deps = make({ configured: true, present: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[0], /graphify update/);
  assert.match(result[1], /README\.md or related docs/);
  assert.match(result[2], /cdk:commit-changes/);
});

test('decide tells Claude to skip the docs step when nothing documented changed', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[0], /otherwise skip this step/);
});

test('decide omits the docs step while the ship-release marker exists', () => {
  // Arrange
  const deps = make({ marker: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.deepEqual(result, []);
});

test('decide omits the docs step in an unsafe git state', () => {
  // Arrange
  const deps = make({ unsafe: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.deepEqual(result, []);
});

test('decide omits the docs step outside a git repo', () => {
  // Arrange
  const deps = make({ inside: false });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.deepEqual(result, []);
});

test('decide omits the docs step for a question prompt', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide({ prompt: 'How does it work?' }, deps);
  // Assert
  assert.deepEqual(result, []);
});
