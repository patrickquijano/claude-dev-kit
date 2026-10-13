import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide, gate, snapshot } from '../../../../../hooks/scripts/lib/task-end.mjs';

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
const prompt = {};

test('decide asks for changelog, docs, and commit steps in a git repo', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(result.length, 3);
  assert.match(result[0], /README\.md or related docs/);
  assert.match(result[1], /cdk:write-changelog/);
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

test('decide omits only the commit step while the ship-release marker exists', () => {
  // Arrange
  const deps = make({ marker: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(result.length, 2);
  assert.match(result[0], /README\.md or related docs/);
  assert.match(result[1], /cdk:write-changelog/);
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

test('decide puts the docs step between Graphify and the changelog step', () => {
  // Arrange
  const deps = make({ installed: true, configured: true, present: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[0], /graphify update/);
  assert.match(result[1], /README\.md or related docs/);
  assert.match(result[2], /cdk:write-changelog/);
  assert.match(result[3], /cdk:commit-changes/);
});

test('decide forbids a release or version bump in the changelog step', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[1], /never cut a release or bump the version/);
  assert.match(result[1], /nothing user-facing changed, skip this step/i);
});

test('decide makes the changelog step ask first with Update changelog and Skip', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[1], /AskUserQuestion/);
  assert.match(result[1], /"Update changelog" and "Skip"/);
  assert.match(result[1], /\(Recommended\)/);
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
  assert.doesNotMatch(result[2], /AskUserQuestion/);
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
  assert.match(result[1], /cdk:write-changelog/);
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
  assert.match(result[0], /otherwise skip this step/);
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

const stateDeps = ({ state = {}, now = 'b' } = {}) => {
  const writes = [];
  return {
    ...make(),
    fingerprint: () => now,
    statePath: () => '/state.json',
    readState: () => state,
    writeState: (f, v) => writes.push(v),
    writes
  };
};
const session = { session_id: 's1', prompt: 'Fix X' };

test('snapshot writes the baseline and fired false for a prompt', () => {
  // Arrange
  const deps = stateDeps({ now: 'abc' });
  // Act
  snapshot(session, deps);
  // Assert
  assert.deepEqual(deps.writes, [{ baseline: 'abc', fired: false }]);
});

test('snapshot records an empty-tree fingerprint as the baseline', () => {
  // Arrange
  const deps = stateDeps({ now: '' });
  // Act
  snapshot(session, deps);
  // Assert
  assert.deepEqual(deps.writes, [{ baseline: '', fired: false }]);
});

test('snapshot skips a blank prompt', () => {
  // Arrange
  const deps = stateDeps();
  // Act
  snapshot({ ...session, prompt: '  ' }, deps);
  // Assert
  assert.deepEqual(deps.writes, []);
});

test('snapshot skips a task-notification prompt', () => {
  // Arrange
  const deps = stateDeps();
  // Act
  snapshot({ ...session, prompt: '<task-notification>done' }, deps);
  // Assert
  assert.deepEqual(deps.writes, []);
});

test('snapshot skips when the fingerprint is null', () => {
  // Arrange
  const deps = stateDeps({ now: null });
  // Act
  snapshot(session, deps);
  // Assert
  assert.deepEqual(deps.writes, []);
});

test('snapshot skips when there is no session id', () => {
  // Arrange
  const deps = stateDeps();
  // Act
  snapshot({ prompt: 'Fix X' }, deps);
  // Assert
  assert.deepEqual(deps.writes, []);
});

test('gate blocks once with the numbered steps in order when files changed', () => {
  // Arrange
  const deps = stateDeps({ state: { baseline: 'a', fired: false }, now: 'b' });
  // Act
  const result = gate(session, deps);
  // Assert
  assert.equal(result.decision, 'block');
  assert.match(result.reason, /1\. .*README\.md.*\n2\. .*cdk:write-changelog.*\n3\. .*cdk:commit-changes/s);
  assert.deepEqual(deps.writes, [{ baseline: 'a', fired: true }]);
});

test('gate lets Claude stop when the task is unfinished and waiting on the user', () => {
  // Arrange
  const deps = stateDeps({ state: { baseline: 'a', fired: false } });
  // Act
  const result = gate(session, deps);
  // Assert
  assert.match(result.reason, /If the task is finished, do these end-of-task steps now/);
  assert.match(result.reason, /not finished and you are waiting on the user, say so and stop/);
});

test('gate blocks even when the transcript already holds the asks', () => {
  // Arrange
  const deps = stateDeps({ state: { baseline: 'a', fired: false }, now: 'b' });
  // Act
  const result = gate({ ...session, transcript_path: '/t.jsonl' }, deps);
  // Assert
  assert.equal(result.decision, 'block');
});

test('gate returns null when the fingerprint is unchanged', () => {
  // Arrange
  const deps = stateDeps({ state: { baseline: 'a', fired: false }, now: 'a' });
  // Act
  const result = gate(session, deps);
  // Assert
  assert.equal(result, null);
});

test('gate returns null when it already fired', () => {
  // Arrange
  const deps = stateDeps({ state: { baseline: 'a', fired: true } });
  // Act
  const result = gate(session, deps);
  // Assert
  assert.equal(result, null);
});

test('gate returns null when there is no state', () => {
  // Arrange
  const deps = stateDeps({ state: {} });
  // Act
  const result = gate(session, deps);
  // Assert
  assert.equal(result, null);
});

test('gate returns null when the fingerprint is null', () => {
  // Arrange
  const deps = stateDeps({ state: { baseline: 'a', fired: false }, now: null });
  // Act
  const result = gate(session, deps);
  // Assert
  assert.equal(result, null);
});

test('gate returns null when there is no session id', () => {
  // Arrange
  const deps = stateDeps({ state: { baseline: 'a', fired: false } });
  // Act
  const result = gate({}, deps);
  // Assert
  assert.equal(result, null);
});
