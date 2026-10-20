import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide, gate } from '../../../../../hooks/scripts/lib/task-end.mjs';

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
  assert.match(result[1], /cdk:update-changelog/);
  assert.match(result[2], /cdk:commit-changes/);
});

test('decide tells the commit step to commit all uncommitted changes with no paths argument', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[2], /no `paths:` argument/);
  assert.match(result[2], /all uncommitted changes/);
});

test('decide tells Claude to skip the commit step when the working tree is clean', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[2], /working tree is clean, skip this step/);
});

test('decide does not scope the commit step to this task or leave dirty files out', () => {
  // Arrange
  const deps = make();
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.doesNotMatch(result[2], /paths: </);
  assert.doesNotMatch(result[2], /already dirty/);
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
  assert.match(result[1], /cdk:update-changelog/);
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
  assert.match(result[2], /cdk:update-changelog/);
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
    result.some((p) => /update-changelog/.test(p)),
    true
  );
});

test('decide keeps the changelog step while the ship-release marker exists', () => {
  // Arrange
  const deps = make({ marker: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.match(result[1], /cdk:update-changelog/);
});

test('decide omits the changelog step in an unsafe git state', () => {
  // Arrange
  const deps = make({ unsafe: true });
  // Act
  const result = decide(prompt, deps);
  // Assert
  assert.equal(
    result.some((p) => /update-changelog/.test(p)),
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
    result.some((p) => /update-changelog/.test(p)),
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

const stateDeps = ({ state = {}, now = 'b', writeError = null, inside = true } = {}) => {
  const writes = [];
  const texts = [];
  return {
    ...make({ inside }),
    fingerprint: () => now,
    statePath: () => '/state.json',
    readState: () => state,
    writeState: (f, v) => writes.push(v),
    writeText: (f, t) => {
      if (writeError) throw writeError;
      texts.push({ file: f, text: t });
    },
    writes,
    texts
  };
};
const session = { session_id: 's1' };

test('gate blocks a dirty tree with no state, with the steps in order', () => {
  // Arrange
  const deps = stateDeps({ state: {}, now: 'b' });
  // Act
  const result = gate(session, deps);
  // Assert
  assert.equal(result.decision, 'block');
  assert.match(deps.texts[0].text, /1\. .*README\.md.*\n2\. .*cdk:update-changelog.*\n3\. .*cdk:commit-changes/s);
  assert.deepEqual(deps.writes, [{ firedAt: 'b', awaiting: true }]);
});

test('gate blocks when the fingerprint differs from the last fired tree', () => {
  // Arrange
  const deps = stateDeps({ state: { firedAt: 'a', awaiting: false }, now: 'b' });
  // Act
  const result = gate(session, deps);
  // Assert
  assert.equal(result.decision, 'block');
});

test('gate lets Claude stop when the task is unfinished and waiting on the user', () => {
  // Arrange
  const deps = stateDeps();
  // Act
  gate(session, deps);
  // Assert
  assert.match(deps.texts[0].text, /The working tree has uncommitted changes/);
  assert.match(deps.texts[0].text, /not finished and you are waiting on the user, say so and stop/);
});

test('gate sends a one-line reason that points at the steps file', () => {
  // Arrange
  const deps = stateDeps();
  // Act
  const result = gate(session, deps);
  // Assert
  assert.equal(result.reason, `End-of-task steps pending: read ${deps.texts[0].file} and follow it, in order.`);
  assert.equal(result.reason.includes('\n'), false);
  assert.match(deps.texts[0].file, /\/repo\/\.git\/cdk-ship-release$/);
});

for (const code of ['EACCES', 'EPERM', 'EROFS', 'ENOENT', 'ENOSPC']) {
  test(`gate falls back to the inline steps when the file write fails with ${code}`, () => {
    // Arrange
    const deps = stateDeps({ writeError: Object.assign(new Error(code), { code }) });
    // Act
    const result = gate(session, deps);
    // Assert
    assert.equal(result.decision, 'block');
    assert.match(result.reason, /1\. .*README\.md.*\n2\. .*cdk:update-changelog/s);
    assert.deepEqual(deps.writes, [{ firedAt: 'b', awaiting: true }]);
  });
}

test('gate lets an unexpected file write error bubble', () => {
  // Arrange
  const deps = stateDeps({ writeError: Object.assign(new Error('boom'), { code: 'EIO' }) });
  // Act
  const act = () => gate(session, deps);
  // Assert
  assert.throws(act, /boom/);
});

test('gate falls back to the inline steps when git gives no steps path', () => {
  // Arrange
  const deps = stateDeps({ inside: false });
  deps.git = (cwd, args) => ({ status: args[1] === '--git-path' ? 128 : 0, stdout: Buffer.from('') });
  // Act
  const result = gate(session, deps);
  // Assert
  assert.match(result.reason, /1\. .*README\.md/);
  assert.deepEqual(deps.texts, []);
});

test('gate blocks a stop_hook_active continuation that was not awaiting the steps', () => {
  // Arrange
  const deps = stateDeps({ state: { firedAt: 'a', awaiting: false }, now: 'b' });
  // Act
  const result = gate({ ...session, stop_hook_active: true }, deps);
  // Assert
  assert.equal(result.decision, 'block');
});

test('gate records the tree and returns null for the continuation that ran the steps', () => {
  // Arrange
  const deps = stateDeps({ state: { firedAt: 'a', awaiting: true }, now: 'c' });
  // Act
  const result = gate({ ...session, stop_hook_active: true }, deps);
  // Assert
  assert.equal(result, null);
  assert.deepEqual(deps.writes, [{ firedAt: 'c', awaiting: false }]);
});

test('gate returns null for a clean tree', () => {
  // Arrange
  const deps = stateDeps({ now: '' });
  // Act
  const result = gate(session, deps);
  // Assert
  assert.equal(result, null);
});

test('gate returns null when the fingerprint equals the last fired tree', () => {
  // Arrange
  const deps = stateDeps({ state: { firedAt: 'b', awaiting: false }, now: 'b' });
  // Act
  const result = gate(session, deps);
  // Assert
  assert.equal(result, null);
});

test('gate returns null when the fingerprint is null', () => {
  // Arrange
  const deps = stateDeps({ now: null });
  // Act
  const result = gate(session, deps);
  // Assert
  assert.equal(result, null);
});

test('gate returns null when there is no session id', () => {
  // Arrange
  const deps = stateDeps();
  // Act
  const result = gate({}, deps);
  // Assert
  assert.equal(result, null);
});

test('gate ignores an old-format state file and fires once', () => {
  // Arrange
  const deps = stateDeps({ state: { baseline: 'a', fired: true }, now: 'b' });
  // Act
  const result = gate(session, deps);
  // Assert
  assert.equal(result.decision, 'block');
});
