import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { bump, evaluate } from '../../../../hooks/scripts/release-check.mjs';

const SCRIPT = fileURLToPath(new URL('../../../../hooks/scripts/release-check.mjs', import.meta.url));
const POLICY = {
  changelog: 'CHANGELOG.md',
  defaultBranch: 'main',
  remote: 'origin',
  versionFiles: [{ path: 'plugin.json', key: 'version' }],
  userFacing: ['skills/**'],
  exempt: [{ glob: 'skills/docs/**', reason: 'docs only' }]
};
const CHANGELOG = '# Changelog\n\n## [Unreleased]\n\n## [0.1.0] - 2026-01-01\n\n- first\n';

const dirs = [];
const sh = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const write = (cwd, file, text) => {
  mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
  writeFileSync(path.join(cwd, file), text);
};
const commit = (cwd, files, msg) => {
  for (const [f, t] of Object.entries(files)) write(cwd, f, t);
  sh(cwd, 'add', '-A');
  sh(cwd, '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', msg);
};
const pj = (v) => `{\n  "name": "x",\n  "version": "${v}"\n}\n`;
const codes = (r) => r.failures.map((f) => f.code).sort();
const push = (w) => sh(w, 'push', '-q', '-u', 'origin', 'feat/x');
const withChangelog = (line) => CHANGELOG.replace('## [Unreleased]\n', `## [Unreleased]\n\n- ${line}\n`);
const released = (extra = {}) => ({
  'skills/a/SKILL.md': 'a\n',
  'CHANGELOG.md': withChangelog('Added a.'),
  'plugin.json': pj('0.2.0'),
  ...extra
});
const advanceMain = (work) => {
  sh(work, 'checkout', '-q', 'main');
  commit(work, { 'plugin.json': pj('0.2.0') }, 'chore(release): bump version to 0.2.0');
  sh(work, 'push', '-q', 'origin', 'main');
  sh(work, 'checkout', '-q', 'feat/x');
  sh(work, '-c', 'commit.gpgsign=false', 'rebase', '-q', 'main');
  write(work, 'plugin.json', pj('0.2.0'));
};

// Repo with bare origin, `main` at 0.1.0, and a feature branch checked out.
function repo({ policy = POLICY } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'rc-'));
  dirs.push(dir);
  const bare = path.join(dir, 'origin.git');
  const work = path.join(dir, 'work');
  sh(dir, 'init', '-q', '--bare', '-b', 'main', bare);
  sh(dir, 'clone', '-q', bare, work);
  sh(work, 'config', 'user.email', 't@t');
  sh(work, 'config', 'user.name', 't');
  sh(work, 'checkout', '-q', '-b', 'main');
  const files = { 'plugin.json': pj('0.1.0'), 'CHANGELOG.md': CHANGELOG, 'README.md': 'x\n' };
  if (policy) files['.claude/release-policy.json'] = JSON.stringify(policy);
  commit(work, files, 'chore: init');
  sh(work, 'push', '-q', '-u', 'origin', 'main');
  sh(work, 'checkout', '-q', '-b', 'feat/x');
  return { dir, work };
}
const runHook = (input) =>
  spawnSync('node', [SCRIPT, 'hook'], { input: JSON.stringify(input), encoding: 'utf8', timeout: 60_000 });
const runCli = (cwd, args) => spawnSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8', timeout: 60_000 });

after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe('release-check without a policy', () => {
  test('evaluate skips', () => {
    // Arrange
    const { work } = repo({ policy: null });
    // Act
    const res = evaluate(work);
    // Assert
    assert.equal(res.skipped, true);
  });

  test('bump changes nothing', () => {
    // Arrange
    const { work } = repo({ policy: null });
    // Act
    const res = bump(work);
    // Assert
    assert.deepEqual(res.changed, []);
  });

  test('hook allows PR creation', () => {
    // Arrange
    const { work } = repo({ policy: null });
    const event = { tool_name: 'Bash', cwd: work, tool_input: { command: 'gh pr create' } };
    // Act
    const res = runHook(event);
    // Assert
    assert.equal(res.status, 0);
  });
});

describe('release-check evaluate', () => {
  test('skips an exempt-only change and notes the reason', () => {
    // Arrange
    const { work } = repo();
    commit(work, { 'skills/docs/a.md': 'a\n' }, 'feat: docs');
    // Act
    const res = evaluate(work);
    // Assert
    assert.equal(res.ok, true);
    assert.equal(res.skipped, true);
    assert.ok(res.notes.some((n) => n.includes('docs only')));
  });

  test('fails a feat without changelog or version', () => {
    // Arrange
    const { work } = repo();
    commit(work, { 'skills/a/SKILL.md': 'a\n' }, 'feat: add a');
    push(work);
    // Act
    const res = evaluate(work);
    // Assert
    assert.deepEqual(codes(res), ['changelog-unchanged', 'version-unchanged']);
  });

  test('passes a feat with an entry and a minor bump', () => {
    // Arrange
    const { work } = repo();
    commit(work, released(), 'feat: add a');
    push(work);
    // Act
    const res = evaluate(work);
    // Assert
    assert.deepEqual(res.failures, []);
    assert.equal(res.required, '0.2.0');
  });

  test('passes again on a repeat run', () => {
    // Arrange
    const { work } = repo();
    commit(work, released(), 'feat: add a');
    push(work);
    evaluate(work);
    // Act
    const res = evaluate(work);
    // Assert
    assert.deepEqual(res.failures, []);
    assert.equal(res.required, '0.2.0');
  });

  test('fails a fix with a minor bump as over-bumped', () => {
    // Arrange
    const { work } = repo();
    commit(work, released({ 'CHANGELOG.md': withChangelog('Fixed a.') }), 'fix: a');
    push(work);
    // Act
    const res = evaluate(work);
    // Assert
    assert.deepEqual(codes(res), ['version-over-bumped']);
  });

  test('accepts a deliberate release above the required version with a new section', () => {
    // Arrange
    const { work } = repo();
    const cl = CHANGELOG.replace('## [0.1.0]', '## [1.0.0] - 2026-02-01\n\n- release\n\n## [0.1.0]');
    commit(work, released({ 'CHANGELOG.md': cl, 'plugin.json': pj('1.0.0') }), 'feat: a');
    push(work);
    // Act
    const res = evaluate(work);
    // Assert
    assert.deepEqual(codes(res), []);
    assert.equal(res.accepted, '1.0.0');
  });

  test('keeps a higher version over-bumped when its section already exists on main', () => {
    // Arrange
    const { work } = repo();
    const cl = CHANGELOG.replace('## [0.1.0]', '## [1.0.0] - 2026-02-01\n\n- release\n\n## [0.1.0]');
    commit(work, { 'CHANGELOG.md': cl }, 'chore: pre-release section');
    sh(work, 'push', '-q', 'origin', 'feat/x:main');
    commit(work, { 'skills/a/SKILL.md': 'a\n', 'plugin.json': pj('1.0.0') }, 'feat: a');
    push(work);
    // Act
    const res = evaluate(work);
    // Assert
    assert.ok(codes(res).includes('version-over-bumped'));
  });

  test('requires a major bump for a breaking change', () => {
    // Arrange
    const { work } = repo();
    commit(work, released({ 'CHANGELOG.md': withChangelog('Changed a.') }), 'feat!: break a');
    push(work);
    // Act
    const res = evaluate(work);
    // Assert
    assert.equal(res.required, '1.0.0');
    assert.deepEqual(codes(res), ['version-lower']);
  });

  test('reports a duplicate entry and inconsistent version files', () => {
    // Arrange
    const policy = { ...POLICY, versionFiles: [...POLICY.versionFiles, { path: 'other.json', key: 'version' }] };
    const { work } = repo({ policy });
    commit(work, { 'other.json': pj('0.1.0') }, 'chore: other');
    sh(work, 'push', '-q', 'origin', 'main');
    commit(work, released({ 'CHANGELOG.md': withChangelog('Added a.\n- Added  A.') }), 'feat: a');
    push(work);
    // Act
    const res = evaluate(work);
    // Assert
    assert.deepEqual(codes(res), ['changelog-duplicate', 'version-inconsistent']);
  });

  test('reports an invalid version file', () => {
    // Arrange
    const policy = { ...POLICY, versionFiles: [...POLICY.versionFiles, { path: 'other.json', key: 'version' }] };
    const { work } = repo({ policy });
    commit(work, { 'other.json': pj('0.1.0') }, 'chore: other');
    sh(work, 'push', '-q', 'origin', 'main');
    commit(work, released({ 'other.json': '{"version":"bad"}' }), 'feat: a');
    push(work);
    // Act
    const res = evaluate(work);
    // Assert
    assert.ok(codes(res).includes('version-invalid'));
  });

  test('accepts a release section in the diff in place of an entry', () => {
    // Arrange
    const { work } = repo();
    const cl =
      '# Changelog\n\n## [Unreleased]\n\n## [0.2.0] - 2026-02-01\n\n- added a\n\n## [0.1.0] - 2026-01-01\n\n- first\n';
    commit(work, released({ 'CHANGELOG.md': cl }), 'feat: a');
    push(work);
    // Act
    const res = evaluate(work);
    // Assert
    assert.deepEqual(res.failures, []);
  });

  test('fails a missing changelog file', () => {
    // Arrange
    const { work } = repo();
    commit(work, { 'skills/a/SKILL.md': 'a\n', 'plugin.json': pj('0.2.0') }, 'feat: a');
    sh(work, 'rm', '-q', 'CHANGELOG.md');
    sh(work, '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'chore: drop changelog');
    push(work);
    // Act
    const res = evaluate(work);
    // Assert
    assert.deepEqual(codes(res), ['changelog-missing']);
  });

  test('fails unpushed commits', () => {
    // Arrange
    const { work } = repo();
    commit(work, released(), 'feat: a');
    // Act
    const res = evaluate(work);
    // Assert
    assert.deepEqual(codes(res), ['unpushed']);
  });

  test('does not check pushes with prePush', () => {
    // Arrange
    const { work } = repo();
    commit(work, released(), 'feat: a');
    // Act
    const res = evaluate(work, { prePush: true });
    // Assert
    assert.deepEqual(res.failures, []);
  });

  test('fails a dirty generated file as uncommitted', () => {
    // Arrange
    const { work } = repo();
    commit(work, released(), 'feat: a');
    push(work);
    write(work, 'CHANGELOG.md', `${withChangelog('Added a.')}\n- more\n`);
    // Act
    const res = evaluate(work);
    // Assert
    assert.deepEqual(codes(res), ['uncommitted']);
  });

  test('fails fetch-failed for a bad target', () => {
    // Arrange
    const { work } = repo();
    commit(work, { 'skills/a/SKILL.md': 'a\n' }, 'feat: a');
    // Act
    const res = evaluate(work, { target: 'nope' });
    // Assert
    assert.deepEqual(codes(res), ['fetch-failed']);
  });

  test('fails unsafe-state on a detached HEAD', () => {
    // Arrange
    const { work } = repo();
    commit(work, { 'skills/a/SKILL.md': 'a\n' }, 'feat: a');
    sh(work, 'checkout', '-q', '--detach');
    // Act
    const res = evaluate(work);
    // Assert
    assert.deepEqual(codes(res), ['unsafe-state']);
  });

  test('ignores a detached HEAD in CI mode', () => {
    // Arrange
    const { work } = repo();
    commit(work, { 'skills/a/SKILL.md': 'a\n' }, 'feat: a');
    sh(work, 'checkout', '-q', '--detach');
    // Act
    const res = evaluate(work, { ci: true });
    // Assert
    assert.notDeepEqual(codes(res), ['unsafe-state']);
  });

  test('fails no-remote when the remote is gone', () => {
    // Arrange
    const { work } = repo();
    commit(work, { 'skills/a/SKILL.md': 'a\n' }, 'feat: a');
    sh(work, 'remote', 'remove', 'origin');
    // Act
    const res = evaluate(work);
    // Assert
    assert.deepEqual(codes(res), ['no-remote']);
  });

  test('CI mode uses the existing remote ref without fetching', () => {
    // Arrange
    const { dir, work } = repo();
    commit(work, released(), 'feat: a');
    sh(work, 'remote', 'set-url', 'origin', path.join(dir, 'gone.git'));
    // Act
    const res = evaluate(work, { ci: true });
    // Assert
    assert.deepEqual(res.failures, []);
  });

  test('without CI mode an unreachable remote fails the fetch', () => {
    // Arrange
    const { dir, work } = repo();
    commit(work, released(), 'feat: a');
    sh(work, 'remote', 'set-url', 'origin', path.join(dir, 'gone.git'));
    // Act
    const res = evaluate(work);
    // Assert
    assert.deepEqual(codes(res), ['fetch-failed']);
  });

  test('requires a patch bump without a pending subject', () => {
    // Arrange
    const { work } = repo();
    write(work, 'skills/a/SKILL.md', 'a\n');
    // Act
    const res = evaluate(work, { prePush: true });
    // Assert
    assert.equal(res.required, '0.1.1');
  });

  test('counts a pending feat subject for an uncommitted change', () => {
    // Arrange
    const { work } = repo();
    write(work, 'skills/a/SKILL.md', 'a\n');
    // Act
    const res = evaluate(work, { prePush: true, pendingSubject: 'feat: add a' });
    // Assert
    assert.equal(res.required, '0.2.0');
  });

  test('requires a bump again after the target advanced', () => {
    // Arrange
    const { work } = repo();
    commit(work, released(), 'feat: a');
    push(work);
    advanceMain(work);
    // Act
    const res = evaluate(work, { prePush: true });
    // Assert
    assert.ok(codes(res).includes('version-unchanged'));
  });
});

describe('release-check bump', () => {
  test('keeps a deliberate release', () => {
    // Arrange
    const { work } = repo();
    const cl = CHANGELOG.replace('## [0.1.0]', '## [1.0.0] - 2026-02-01\n\n- release\n\n## [0.1.0]');
    commit(work, released({ 'CHANGELOG.md': cl, 'plugin.json': pj('1.0.0') }), 'feat: a');
    push(work);
    // Act
    const res = bump(work);
    // Assert
    assert.deepEqual(res.changed, []);
  });

  test('moves the version after the target advanced', () => {
    // Arrange
    const { work } = repo();
    commit(work, released(), 'feat: a');
    push(work);
    advanceMain(work);
    // Act
    const res = bump(work);
    // Assert
    assert.deepEqual(res.changed, [{ path: 'plugin.json', from: '0.2.0', to: '0.3.0' }]);
    assert.equal(readFileSync(path.join(work, 'plugin.json'), 'utf8'), pj('0.3.0'));
  });

  test('is idempotent on a second run', () => {
    // Arrange
    const { work } = repo();
    commit(work, released(), 'feat: a');
    push(work);
    advanceMain(work);
    bump(work);
    // Act
    const res = bump(work);
    // Assert
    assert.deepEqual(res.changed, []);
  });

  test('writes the version a pending subject requires', () => {
    // Arrange
    const { work } = repo();
    write(work, 'skills/a/SKILL.md', 'a\n');
    // Act
    const res = bump(work, { pendingSubject: 'feat: add a' });
    // Assert
    assert.ok(res.changed.some((c) => c.to === '0.2.0'));
    assert.equal(JSON.parse(readFileSync(path.join(work, 'plugin.json'), 'utf8')).version, '0.2.0');
  });
});

describe('release-check hook', () => {
  const event = (work, command) => ({ tool_name: 'Bash', cwd: work, tool_input: { command } });

  test('blocks with exit 2 and the codes until fixed', () => {
    // Arrange
    const { work } = repo();
    commit(work, { 'skills/a/SKILL.md': 'a\n' }, 'feat: a');
    push(work);
    // Act
    const res = runHook(event(work, 'gh pr create -B main'));
    // Assert
    assert.equal(res.status, 2);
    assert.match(res.stderr, /changelog-unchanged/);
    assert.match(res.stderr, /version-unchanged/);
  });

  test('allows a command that does not create a request', () => {
    // Arrange
    const { work } = repo();
    commit(work, { 'skills/a/SKILL.md': 'a\n' }, 'feat: a');
    push(work);
    // Act
    const res = runHook(event(work, 'git status'));
    // Assert
    assert.equal(res.status, 0);
  });

  test('allows once the release files are pushed', () => {
    // Arrange
    const { work } = repo();
    commit(work, { 'skills/a/SKILL.md': 'a\n' }, 'feat: a');
    commit(work, { 'CHANGELOG.md': withChangelog('Added a.'), 'plugin.json': pj('0.2.0') }, 'chore: release files');
    push(work);
    // Act
    const res = runHook(event(work, 'gh pr create -B main'));
    // Assert
    assert.equal(res.status, 0);
  });

  test('allows a repeat call from the cache', () => {
    // Arrange
    const { work } = repo();
    commit(work, released(), 'feat: a');
    push(work);
    runHook(event(work, 'gh pr create -B main'));
    // Act
    const res = runHook(event(work, 'gh pr create -B main'));
    // Assert
    assert.equal(res.status, 0);
  });
});

describe('release-check CLI', () => {
  test('check --subject reads the pending subject from a file', () => {
    // Arrange
    const { dir, work } = repo();
    write(work, 'skills/a/SKILL.md', 'a\n');
    write(work, 'CHANGELOG.md', withChangelog('Added a.'));
    write(work, 'plugin.json', pj('0.2.0'));
    const subject = path.join(dir, 'msg');
    writeFileSync(subject, 'feat: add a\n');
    // Act
    const res = runCli(work, ['check', '--pre-push', '--subject', subject, '--json']);
    // Assert
    assert.deepEqual(codes(JSON.parse(res.stdout)), ['uncommitted']);
  });

  test('check --subject without a path exits 2', () => {
    // Arrange
    const { work } = repo();
    // Act
    const res = runCli(work, ['check', '--subject', '--json']);
    // Assert
    assert.equal(res.status, 2);
  });
});
