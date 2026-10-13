import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide, output } from '../../../../../hooks/scripts/lib/task-end.mjs';

function make({
  installed = false,
  configured = false,
  present = false,
  inside = true,
  marker = false,
  unsafe = false,
  badCwd = false,
  unitTests = null,
  changelog = false
} = {}) {
  return {
    env: { CLAUDE_PROJECT_DIR: '/repo' },
    cwd: () => '/cwd',
    realpathSync: (p) => {
      if (badCwd) throw new Error('ENOENT');
      return p;
    },
    graphifyInstalled: () => installed,
    graphifyConfigured: () => configured,
    graphifyFilesExist: () => present,
    unitTestCommand: () => unitTests,
    git: (cwd, args) => {
      if (args[0] === 'rev-parse' && args[1] === '--is-inside-work-tree') {
        return { status: inside ? 0 : 128, stdout: Buffer.from('true\n') };
      }
      return { status: 0, stdout: Buffer.from('.git/cdk-ship-release\n') };
    },
    existsSync: (p) => (String(p).endsWith('CHANGELOG.md') ? changelog : marker),
    unsafeState: () => unsafe
  };
}
const prompt = { prompt: 'Fix the bug' };

test('decide asks for changelog, docs, and commit steps in a git repo', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(result.length, 3);
  assert.match(result[0], /cdk:write-changelog/);
  assert.match(result[1], /README\.md or related docs/);
  assert.match(result[2], /cdk:commit-changes/);
});

test('decide scopes the commit step to the paths this task changed', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[2], /paths: <the files this task created, edited, or deleted>/);
});

test('decide tells Claude to skip the commit step when this task changed no files', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[2], /changed no files, skip this step/);
});

test('decide does not tell Claude to commit every dirty file', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.doesNotMatch(result[2], /If this task changed files,/);
});

test('decide runs graphify update first when the graph exists', () => {
  // Arrange
  const deps = make({ installed: true, configured: true, present: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(result.length, 4);
  assert.match(result[0], /graphify update \./);
  assert.match(result[3], /cdk:commit-changes/);
});

test('decide asks for the graphify skill when configured but the graph is missing', () => {
  // Arrange
  const deps = make({ installed: true, configured: true, present: false });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[0], /`graphify` skill with the argument `\.`/);
});

test('decide suggests setup when graphify is installed but not configured and has no graph', () => {
  // Arrange
  const deps = make({ installed: true, configured: false, present: false });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[0], /suggest `\/cdk:setup-graphify`/);
  assert.match(result[0], /do not build the graph yourself/);
});

test('decide omits the Graphify step when graphify is not installed', () => {
  // Arrange
  const deps = make({ installed: false, configured: true, present: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(
    result.some((p) => /graphify/i.test(p)),
    false
  );
});

test('decide limits the Graphify step to code changes', () => {
  // Arrange
  const deps = make({ installed: true, configured: true, present: false });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[0], /changed code files \(not only docs or config\)/);
});

test('decide makes every step conditional on git status', () => {
  // Arrange
  const deps = make({ installed: true, configured: true, present: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(result.length, 4);
  for (const step of result) assert.match(step, /git status --porcelain/);
});

test('decide adds the steps for a question prompt', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide({ prompt: 'What does stop.mjs do?' }, deps);
  // Assert
  assert.equal(result.length, 3);
});

test('decide adds the steps for a slash-command prompt', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide({ prompt: '/cdk:ship-release' }, deps);
  // Assert
  assert.equal(result.length, 3);
});

test('decide adds the steps for a bang prompt', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide({ prompt: '  !ls' }, deps);
  // Assert
  assert.equal(result.length, 3);
});

test('decide returns nothing for a missing or blank prompt', () => {
  // Arrange
  const deps = make();
  // Act
  const results = [decide({}, deps), decide({ prompt: '   ' }, deps), decide(null, deps)];
  // Assert
  assert.deepEqual(results, [[], [], []]);
});

test('decide omits only the commit step while the ship-release marker exists', () => {
  // Arrange
  const deps = make({ marker: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(result.length, 2);
  assert.match(result[0], /cdk:write-changelog/);
  assert.match(result[1], /README\.md or related docs/);
});

test('decide keeps only the docs step in an unsafe git state', () => {
  // Arrange
  const deps = make({ unsafe: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(result.length, 1);
  assert.match(result[0], /README\.md or related docs/);
});

test('decide keeps Graphify and docs but no changelog or commit outside a git repo', () => {
  // Arrange
  const deps = make({ inside: false, installed: true, configured: true, present: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(result.length, 2);
  assert.match(result[0], /graphify update/);
  assert.match(result[1], /README\.md or related docs/);
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

test('decide puts the changelog step between Graphify and the docs step', () => {
  // Arrange
  const deps = make({ installed: true, configured: true, present: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[0], /graphify update/);
  assert.match(result[1], /cdk:write-changelog/);
  assert.match(result[2], /README\.md or related docs/);
  assert.match(result[3], /cdk:commit-changes/);
});

test('decide forbids a release or version bump in the changelog step', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[0], /never cut a release or bump the version/);
  assert.match(result[0], /nothing user-facing changed, skip this step/i);
});

test('decide makes the changelog step ask first with Update changelog and Skip', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[0], /AskUserQuestion/);
  assert.match(result[0], /"Update changelog" and "Skip"/);
  assert.match(result[0], /\(Recommended\)/);
});

test('decide makes the commit step ask first with Commit and push and Skip', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[2], /AskUserQuestion/);
  assert.match(result[2], /"Commit and push" and "Skip"/);
  assert.match(result[2], /\(Recommended\)/);
});

test('decide does not ask in the docs, unit-test, or Graphify steps', () => {
  // Arrange
  const deps = make({ installed: true, configured: true, present: true, unitTests: 'npm run test:unit' });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.doesNotMatch(result[0], /AskUserQuestion/);
  assert.doesNotMatch(result[1], /AskUserQuestion/);
  assert.doesNotMatch(result[3], /AskUserQuestion/);
});

test('decide has no ask at all in an unsafe git state', () => {
  // Arrange
  const deps = make({ unsafe: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.doesNotMatch(result.join('\n'), /AskUserQuestion/);
});

test('decide keeps the changelog step when CHANGELOG.md is missing', () => {
  // Arrange
  const deps = make({ changelog: false });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(
    result.some((p) => /write-changelog/.test(p)),
    true
  );
});

test('decide keeps the changelog step while the ship-release marker exists', () => {
  // Arrange
  const deps = make({ marker: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[0], /cdk:write-changelog/);
});

test('decide omits the changelog step in an unsafe git state', () => {
  // Arrange
  const deps = make({ unsafe: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(
    result.some((p) => /write-changelog/.test(p)),
    false
  );
});

test('decide omits the changelog step outside a git repo', () => {
  // Arrange
  const deps = make({ inside: false });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(
    result.some((p) => /write-changelog/.test(p)),
    false
  );
});

test('decide tells Claude to skip the docs step when nothing documented changed', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[1], /otherwise skip this step/);
});

test('decide puts the unit-test step first, before Graphify', () => {
  // Arrange
  const deps = make({ installed: true, configured: true, present: true, unitTests: 'npm run test:unit' });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(result.length, 5);
  assert.match(result[0], /run the unit tests/);
  assert.match(result[1], /graphify update/);
});

test('decide names the detected command in the unit-test step', () => {
  // Arrange
  const deps = make({ unitTests: 'go test ./...' });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[0], /`go test \.\/\.\.\.`/);
  assert.match(result[0], /re-run until they pass/);
});

test('decide omits the unit-test step when no command is detected', () => {
  // Arrange
  const deps = make({ unitTests: null });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(
    result.some((p) => /unit tests/.test(p)),
    false
  );
});

test('decide keeps the unit-test step outside a git repo', () => {
  // Arrange
  const deps = make({ inside: false, unitTests: 'cargo test' });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(result.length, 2);
  assert.match(result[0], /`cargo test`/);
});

test('decide keeps the unit-test step under the ship-release marker', () => {
  // Arrange
  const deps = make({ marker: true, unitTests: 'pytest' });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(result.length, 3);
  assert.match(result[0], /`pytest`/);
});
