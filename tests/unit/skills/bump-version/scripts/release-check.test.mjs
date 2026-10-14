import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  POLICY_FILE,
  bump,
  changelogParts,
  createTarget,
  evaluate,
  levelOf,
  loadPolicy,
  main,
  report,
  runHook,
  segments
} from '../../../../../skills/bump-version/scripts/release-check.mjs';

const ROOT = '/repo';
const POLICY = {
  changelog: 'CHANGELOG.md',
  defaultBranch: 'main',
  remote: 'origin',
  versionFiles: [{ path: 'plugin.json', key: 'version' }],
  userFacing: ['skills/**'],
  exempt: [{ glob: 'skills/docs/**', reason: 'docs only' }]
};
const pj = (v) => `{\n  "name": "x",\n  "version": "${v}"\n}\n`;
const BASE_CL = '# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-01-01\n\n- first\n';
const withEntry = (line) => BASE_CL.replace('## [Unreleased]\n', `## [Unreleased]\n\n- ${line}\n`);
const ok = (stdout = '') => ({ status: 0, stdout: Buffer.from(stdout) });
const no = () => ({ status: 1, stdout: Buffer.from('') });
const codes = (r) => r.failures.map((f) => f.code).sort();

// Fake git and fs for a repo whose target tip is 1.0.0 and whose HEAD is the `head` file set.
function world({
  policy = POLICY,
  head = { 'plugin.json': pj('1.0.0'), 'CHANGELOG.md': BASE_CL },
  targetFiles = { 'plugin.json': pj('1.0.0') },
  baseChangelog = BASE_CL,
  changed = ['skills/a/SKILL.md'],
  dirty = '',
  subjects = ['feat: add a'],
  remote = true,
  fetchOk = true,
  refExists = false,
  unsafe = false,
  mergeBase = 'abc',
  pushed = true
} = {}) {
  const files = { ...head };
  if (policy) files[POLICY_FILE] = JSON.stringify(policy);
  const calls = [];
  const writes = [];
  const git = (cwd, args) => {
    const line = args.join(' ');
    calls.push(line);
    if (line === 'rev-parse --show-toplevel') return ok(ROOT);
    if (line.startsWith('remote get-url')) return remote ? ok('url') : no();
    if (line.startsWith('rev-parse --verify -q refs/remotes/')) return refExists ? ok('x') : no();
    if (line.startsWith('fetch')) return fetchOk ? ok() : no();
    if (line.startsWith('merge-base')) return mergeBase ? ok(mergeBase) : ok('');
    if (line.startsWith('diff --name-only')) return ok(changed.join('\n'));
    if (line.startsWith('status --porcelain=v1 -z')) return ok(dirty);
    if (line.startsWith('log --no-merges')) return ok(subjects.map((s) => `${s}\0\x01`).join(''));
    if (line.startsWith('show origin/main:'))
      return targetFiles[line.slice('show origin/main:'.length)] === undefined
        ? no()
        : ok(targetFiles[line.slice('show origin/main:'.length)]);
    if (line.startsWith('show abc:CHANGELOG.md')) return baseChangelog === null ? no() : ok(baseChangelog);
    if (line === 'symbolic-ref --short HEAD') return ok('feat/x');
    if (line.startsWith('ls-remote')) return ok(pushed ? 'sha1\trefs/heads/feat/x' : '');
    if (line === 'rev-parse HEAD') return ok('sha1');
    return no();
  };
  const deps = {
    git,
    unsafeState: () => unsafe,
    existsSync: (p) => p.startsWith(`${ROOT}/`) && p.slice(ROOT.length + 1) in files,
    readFileSync: (p) => files[p.slice(ROOT.length + 1)],
    writeFileSync: (p, text) => {
      files[p.slice(ROOT.length + 1)] = text;
      writes.push([p, text]);
    }
  };
  return { deps, calls, writes, files };
}

describe('levelOf', () => {
  const c = (subject, body = '') => ({ subject, body });

  test('returns minor when a feat commit is present', () => {
    // Arrange
    const commits = [c('fix: a'), c('feat(x): b')];
    // Act
    const level = levelOf(commits);
    // Assert
    assert.equal(level, 'minor');
  });

  test('returns major for a bang subject', () => {
    // Arrange
    const commits = [c('fix: a'), c('refactor!: b')];
    // Act
    const level = levelOf(commits);
    // Assert
    assert.equal(level, 'major');
  });

  test('returns major for a BREAKING CHANGE body', () => {
    // Arrange
    const commits = [c('fix: a', 'BREAKING CHANGE: x')];
    // Act
    const level = levelOf(commits);
    // Assert
    assert.equal(level, 'major');
  });

  test('returns patch when no commit is a feat or breaking', () => {
    // Arrange
    const commits = [c('docs: a'), c('fix: b')];
    // Act
    const level = levelOf(commits);
    // Assert
    assert.equal(level, 'patch');
  });

  test('returns patch for no commits', () => {
    // Arrange
    const commits = [];
    // Act
    const level = levelOf(commits);
    // Assert
    assert.equal(level, 'patch');
  });
});

describe('changelogParts', () => {
  test('collects normalized bullets under Unreleased', () => {
    // Arrange
    const text = '## [Unreleased]\n\n- Added  A.\n* Fixed b\n';
    // Act
    const { bullets } = changelogParts(text);
    // Assert
    assert.deepEqual(bullets, ['added a.', 'fixed b']);
  });

  test('lists release versions', () => {
    // Arrange
    const text = '## [Unreleased]\n\n## [3.0.0] - 2026-01-01\n\n## [0.9.0] - 2025-01-01\n';
    // Act
    const { releases } = changelogParts(text);
    // Assert
    assert.deepEqual(releases, ['3.0.0', '0.9.0']);
  });

  test('stops collecting bullets at the next heading', () => {
    // Arrange
    const text = '## [Unreleased]\n\n- new\n\n## [3.0.0] - 2026-01-01\n\n- old\n';
    // Act
    const { bullets } = changelogParts(text);
    // Assert
    assert.deepEqual(bullets, ['new']);
  });

  test('returns no bullets when there is no Unreleased section', () => {
    // Arrange
    const text = '## [3.0.0] - 2026-01-01\n\n- old\n';
    // Act
    const { bullets } = changelogParts(text);
    // Assert
    assert.deepEqual(bullets, []);
  });

  test('returns empty parts for the default empty text', () => {
    // Arrange
    // Act
    const parts = changelogParts();
    // Assert
    assert.deepEqual(parts, { bullets: [], releases: [] });
  });
});

describe('loadPolicy', () => {
  test('merges defaults under the policy file and reports the repo root', () => {
    // Arrange
    const { deps } = world({ policy: { versionFiles: [{ path: 'v.json', key: 'version' }] } });
    // Act
    const { root, policy, hash } = loadPolicy('/repo/sub', deps);
    // Assert
    assert.equal(root, ROOT);
    assert.equal(policy.defaultBranch, 'main');
    assert.deepEqual(policy.versionFiles, [{ path: 'v.json', key: 'version' }]);
    assert.equal(typeof hash, 'string');
  });

  test('uses the given directory as the root when git reports none', () => {
    // Arrange
    const { deps } = world({ policy: null });
    deps.git = () => no();
    // Act
    const { root, policy } = loadPolicy('/elsewhere', deps);
    // Assert
    assert.equal(root, '/elsewhere');
    assert.equal(policy, null);
  });

  test('returns a null policy when the file does not exist', () => {
    // Arrange
    const { deps } = world({ policy: null });
    // Act
    const { policy } = loadPolicy(ROOT, deps);
    // Assert
    assert.equal(policy, null);
  });

  test('throws on invalid JSON', () => {
    // Arrange
    const { deps, files } = world();
    files[POLICY_FILE] = '{ nope';
    // Act
    const act = () => loadPolicy(ROOT, deps);
    // Assert
    assert.throws(act, SyntaxError);
  });

  test('throws when the policy is not a JSON object', () => {
    // Arrange
    const { deps, files } = world();
    files[POLICY_FILE] = '[1]';
    // Act
    const act = () => loadPolicy(ROOT, deps);
    // Assert
    assert.throws(act, /policy must be a JSON object/);
  });
});

describe('evaluate', () => {
  const released = () => ({
    head: { 'plugin.json': pj('1.1.0'), 'CHANGELOG.md': withEntry('Added a.') }
  });

  test('skips when there is no policy', () => {
    // Arrange
    const { deps } = world({ policy: null });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.equal(r.skipped, true);
    assert.equal(r.ok, true);
  });

  test('passes a feat with a minor bump and a changelog entry', () => {
    // Arrange
    const { deps } = world(released());
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.deepEqual(r.failures, []);
    assert.equal(r.required, '1.1.0');
    assert.equal(r.level, 'minor');
    assert.equal(r.base, '1.0.0');
  });

  test('lists the commits that drive the level', () => {
    // Arrange
    const { deps } = world({ ...released(), subjects: ['feat: add a', 'fix: b'] });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.deepEqual(r.drivers, ['feat: add a']);
  });

  test('skips with the reason noted when only exempt files changed', () => {
    // Arrange
    const { deps } = world({ changed: ['skills/docs/a.md'] });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.equal(r.skipped, true);
    assert.ok(r.notes.some((n) => n.includes('docs only')));
  });

  test('skips when no changed file is user-facing', () => {
    // Arrange
    const { deps } = world({ changed: ['README.md'] });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.equal(r.skipped, true);
    assert.ok(r.notes.includes('skipped: no release-relevant changes'));
  });

  test('fails changelog-unchanged and version-unchanged for a bare feat', () => {
    // Arrange
    const { deps } = world();
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.deepEqual(codes(r), ['changelog-unchanged', 'version-unchanged']);
  });

  test('fails version-over-bumped when the bump is above the level', () => {
    // Arrange
    const { deps } = world({ ...released(), subjects: ['fix: a'] });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.deepEqual(codes(r), ['version-over-bumped']);
  });

  test('fails version-lower for a breaking change with a minor bump', () => {
    // Arrange
    const { deps } = world({ ...released(), subjects: ['feat!: break a'] });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.equal(r.required, '2.0.0');
    assert.deepEqual(codes(r), ['version-lower']);
  });

  test('accepts a deliberate release above the required version with a new section', () => {
    // Arrange
    const cl = BASE_CL.replace('## [1.0.0]', '## [3.0.0] - 2026-02-01\n\n- release\n\n## [1.0.0]');
    const { deps } = world({ head: { 'plugin.json': pj('3.0.0'), 'CHANGELOG.md': cl } });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.deepEqual(r.failures, []);
    assert.equal(r.accepted, '3.0.0');
  });

  test('keeps a higher version over-bumped when its section already exists on the target', () => {
    // Arrange
    const cl = BASE_CL.replace('## [1.0.0]', '## [3.0.0] - 2026-02-01\n\n- release\n\n## [1.0.0]');
    const { deps } = world({ head: { 'plugin.json': pj('3.0.0'), 'CHANGELOG.md': cl }, baseChangelog: cl });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.ok(codes(r).includes('version-over-bumped'));
  });

  test('fails version-invalid for a version file without x.y.z', () => {
    // Arrange
    const { deps } = world({ head: { 'plugin.json': '{"version":"bad"}', 'CHANGELOG.md': withEntry('Added a.') } });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.ok(codes(r).includes('version-invalid'));
  });

  test('fails version-inconsistent when version files disagree', () => {
    // Arrange
    const policy = { ...POLICY, versionFiles: [...POLICY.versionFiles, { path: 'other.json', key: 'version' }] };
    const { deps } = world({
      policy,
      head: { 'plugin.json': pj('1.1.0'), 'other.json': pj('1.0.0'), 'CHANGELOG.md': withEntry('Added a.') },
      targetFiles: { 'plugin.json': pj('1.0.0'), 'other.json': pj('1.0.0') }
    });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.deepEqual(codes(r), ['version-inconsistent']);
  });

  test('fails changelog-duplicate for a repeated Unreleased entry', () => {
    // Arrange
    const { deps } = world({
      head: { 'plugin.json': pj('1.1.0'), 'CHANGELOG.md': withEntry('Added a.\n- Added  A.') }
    });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.deepEqual(codes(r), ['changelog-duplicate']);
  });

  test('fails changelog-missing when the changelog file is absent', () => {
    // Arrange
    const { deps } = world({ head: { 'plugin.json': pj('1.1.0') }, baseChangelog: null });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.deepEqual(codes(r), ['changelog-missing']);
  });

  test('accepts a new release section in place of an Unreleased entry', () => {
    // Arrange
    const cl = '# Changelog\n\n## [Unreleased]\n\n## [1.1.0] - 2026-02-01\n\n- added a\n\n## [1.0.0] - 2026-01-01\n';
    const { deps } = world({ head: { 'plugin.json': pj('1.1.0'), 'CHANGELOG.md': cl } });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.deepEqual(r.failures, []);
  });

  test('fails uncommitted when a generated file is dirty', () => {
    // Arrange
    const { deps } = world({ ...released(), dirty: ' M CHANGELOG.md\0' });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.deepEqual(codes(r), ['uncommitted']);
  });

  test('fails unpushed when the remote branch is behind HEAD', () => {
    // Arrange
    const { deps } = world({ ...released(), pushed: false });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.deepEqual(codes(r), ['unpushed']);
  });

  test('does not check the push state with prePush', () => {
    // Arrange
    const { deps } = world({ ...released(), pushed: false });
    // Act
    const r = evaluate(ROOT, { prePush: true }, deps);
    // Assert
    assert.deepEqual(r.failures, []);
  });

  test('fails no-remote when the remote is not configured', () => {
    // Arrange
    const { deps } = world({ remote: false });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.deepEqual(codes(r), ['no-remote']);
  });

  test('fails unsafe-state during a merge or detached HEAD', () => {
    // Arrange
    const { deps } = world({ unsafe: true });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.deepEqual(codes(r), ['unsafe-state']);
  });

  test('ignores an unsafe state in CI mode', () => {
    // Arrange
    const { deps } = world({ ...released(), unsafe: true, refExists: true });
    // Act
    const r = evaluate(ROOT, { ci: true }, deps);
    // Assert
    assert.deepEqual(r.failures, []);
  });

  test('fails fetch-failed when the target cannot be fetched', () => {
    // Arrange
    const { deps } = world({ fetchOk: false });
    // Act
    const r = evaluate(ROOT, { target: 'nope' }, deps);
    // Assert
    assert.deepEqual(codes(r), ['fetch-failed']);
  });

  test('does not fetch in CI mode when the remote ref exists', () => {
    // Arrange
    const { deps, calls } = world({ ...released(), refExists: true, fetchOk: false });
    // Act
    const r = evaluate(ROOT, { ci: true }, deps);
    // Assert
    assert.deepEqual(r.failures, []);
    assert.ok(!calls.some((c) => c.startsWith('fetch')));
  });

  test('fails no-merge-base when HEAD shares no history with the target', () => {
    // Arrange
    const { deps } = world({ mergeBase: '' });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.deepEqual(codes(r), ['no-merge-base']);
  });

  test('counts a pending commit subject toward the required level', () => {
    // Arrange
    const { deps } = world({ subjects: [], changed: ['skills/a/SKILL.md'] });
    // Act
    const r = evaluate(ROOT, { prePush: true, pendingSubject: 'feat: add a' }, deps);
    // Assert
    assert.equal(r.required, '1.1.0');
  });

  test('requires only a patch bump without a pending subject', () => {
    // Arrange
    const { deps } = world({ subjects: [], changed: ['skills/a/SKILL.md'] });
    // Act
    const r = evaluate(ROOT, { prePush: true }, deps);
    // Assert
    assert.equal(r.required, '1.0.1');
  });

  test('throws when a version file path escapes the repo', () => {
    // Arrange
    const policy = { ...POLICY, versionFiles: [{ path: '../outside.json', key: 'version' }] };
    const { deps } = world({ policy });
    // Act
    const act = () => evaluate(ROOT, {}, deps);
    // Assert
    assert.throws(act, /path escapes the repo/);
  });
});

describe('bump', () => {
  test('writes the required version into the version file', () => {
    // Arrange
    const { deps, files } = world({ head: { 'plugin.json': pj('1.0.0'), 'CHANGELOG.md': withEntry('Added a.') } });
    // Act
    const r = bump(ROOT, {}, deps);
    // Assert
    assert.deepEqual(r.changed, [{ path: 'plugin.json', from: '1.0.0', to: '1.1.0' }]);
    assert.equal(files['plugin.json'], pj('1.1.0'));
  });

  test('keeps an accepted deliberate release', () => {
    // Arrange
    const cl = BASE_CL.replace('## [1.0.0]', '## [3.0.0] - 2026-02-01\n\n- release\n\n## [1.0.0]');
    const { deps, writes } = world({ head: { 'plugin.json': pj('3.0.0'), 'CHANGELOG.md': cl } });
    // Act
    const r = bump(ROOT, {}, deps);
    // Assert
    assert.deepEqual(r.changed, []);
    assert.deepEqual(writes, []);
  });

  test('changes nothing when the version already matches', () => {
    // Arrange
    const { deps, writes } = world({ head: { 'plugin.json': pj('1.1.0'), 'CHANGELOG.md': withEntry('Added a.') } });
    // Act
    const r = bump(ROOT, {}, deps);
    // Assert
    assert.deepEqual(r.changed, []);
    assert.deepEqual(writes, []);
  });

  test('changes nothing without a release policy', () => {
    // Arrange
    const { deps, writes } = world({ policy: null });
    // Act
    const r = bump(ROOT, {}, deps);
    // Assert
    assert.deepEqual(r.changed, []);
    assert.deepEqual(writes, []);
  });

  test('throws when the version key is missing from the file', () => {
    // Arrange
    const { deps } = world({ head: { 'plugin.json': '{"name":"x"}', 'CHANGELOG.md': withEntry('Added a.') } });
    // Act
    const act = () => bump(ROOT, {}, deps);
    // Assert
    assert.throws(act, /key "version" not found in plugin.json/);
  });
});

describe('pre-1.0 rule and versionReset', () => {
  const CL0 = '# Changelog\n\n## [Unreleased]\n\n## [0.1.0] - 2026-01-01\n\n- first\n';
  const entry = (cl, line) => cl.replace('## [Unreleased]\n', `## [Unreleased]\n\n- ${line}\n`);
  const at = (base, head, over = {}) =>
    world({
      targetFiles: { 'plugin.json': pj(base) },
      head: { 'plugin.json': pj(head), 'CHANGELOG.md': entry(CL0, 'Added a.') },
      baseChangelog: CL0,
      ...over
    });
  const RESET = { version: '0.1.0', reason: 'restart' };

  test('requires a minor bump for a breaking change on 0.1.0', () => {
    // Arrange
    const { deps } = at('0.1.0', '0.1.0', { subjects: ['feat!: break a'] });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.equal(r.required, '0.2.0');
  });

  test('requires a patch bump for a feat on 0.1.0', () => {
    // Arrange
    const { deps } = at('0.1.0', '0.1.0', { subjects: ['feat: add a'] });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.equal(r.required, '0.1.1');
  });

  test('requires a patch bump for a fix on 0.1.0', () => {
    // Arrange
    const { deps } = at('0.1.0', '0.1.0', { subjects: ['fix: a'] });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.equal(r.required, '0.1.1');
  });

  test('still requires a major bump for a breaking change on 1.2.3', () => {
    // Arrange
    const { deps } = at('1.2.3', '1.2.3', { subjects: ['feat!: break a'] });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.equal(r.required, '2.0.0');
  });

  test('requires the reset version when the base is higher, and passes at it', () => {
    // Arrange
    const cl = entry(CL0, 'Added a.').replace('## [0.1.0] - 2026-01-01', '## [0.1.0] - 2026-02-01');
    const { deps } = world({
      policy: { ...POLICY, versionReset: RESET },
      targetFiles: { 'plugin.json': pj('3.0.0') },
      head: { 'plugin.json': pj('0.1.0'), 'CHANGELOG.md': cl },
      baseChangelog: '# Changelog\n\n## [Unreleased]\n\n## [3.0.0] - 2026-01-01\n\n- old\n'
    });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.equal(r.required, '0.1.0');
    assert.deepEqual(r.failures, []);
    assert.ok(r.notes.includes('reset 3.0.0 -> 0.1.0: restart'));
  });

  test('bump writes the reset version through the normal path', () => {
    // Arrange
    const { deps, files } = world({
      policy: { ...POLICY, versionReset: RESET },
      targetFiles: { 'plugin.json': pj('3.0.0') },
      head: { 'plugin.json': pj('3.0.0'), 'CHANGELOG.md': entry(CL0, 'Added a.') }
    });
    // Act
    const r = bump(ROOT, {}, deps);
    // Assert
    assert.deepEqual(r.changed, [{ path: 'plugin.json', from: '3.0.0', to: '0.1.0' }]);
    assert.equal(files['plugin.json'], pj('0.1.0'));
  });

  test('fails version-lower for a downgrade without a reset', () => {
    // Arrange
    const { deps } = world({
      targetFiles: { 'plugin.json': pj('3.0.0') },
      head: { 'plugin.json': pj('0.1.0'), 'CHANGELOG.md': entry(CL0, 'Added a.') }
    });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.ok(codes(r).includes('version-lower'));
  });

  test('ignores a reset at or above the base', () => {
    // Arrange
    const { deps } = at('0.1.0', '0.1.1', {
      policy: { ...POLICY, versionReset: { version: '0.1.0', reason: 'same' } }
    });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.equal(r.required, '0.1.1');
    assert.ok(!r.notes.some((n) => n.startsWith('reset ')));
  });

  test('ignores a malformed reset', () => {
    // Arrange
    const { deps } = at('1.0.0', '1.1.0', {
      policy: { ...POLICY, versionReset: { version: 'zero', reason: 'bad' } }
    });
    // Act
    const r = evaluate(ROOT, {}, deps);
    // Assert
    assert.equal(r.required, '1.1.0');
  });
});

describe('segments', () => {
  test('splits on &&, |, and ;', () => {
    // Arrange
    const command = 'a && b | c; d';
    // Act
    const result = segments(command);
    // Assert
    assert.deepEqual(result, [['a'], ['b'], ['c'], ['d']]);
  });

  test('keeps quoted operators inside one token', () => {
    // Arrange
    const command = 'echo "a && b"';
    // Act
    const result = segments(command);
    // Assert
    assert.deepEqual(result, [['echo', 'a && b']]);
  });

  test('returns no segments for an empty command', () => {
    // Arrange
    const command = '   ';
    // Act
    const result = segments(command);
    // Assert
    assert.deepEqual(result, []);
  });

  test('keeps a lone & inside the segment', () => {
    // Arrange
    const command = 'a & b';
    // Act
    const result = segments(command);
    // Assert
    assert.deepEqual(result, [['a', 'b']]);
  });
});

describe('createTarget', () => {
  const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
  const mcp = (tool_input) => ({ tool_name: 'mcp__plugin_gitlab_gitlab__save_merge_request', tool_input });

  test('returns the default branch for gh pr create without a base', () => {
    // Arrange
    const event = bash('gh pr create -t x');
    // Act
    const target = createTarget(event, 'main');
    // Assert
    assert.equal(target, 'main');
  });

  test('reads the base from --base= after a chained prefix', () => {
    // Arrange
    const event = bash('cd x && GH_TOKEN=1 gh -R a/b pr create -B rel');
    // Act
    const target = createTarget(event, 'main');
    // Assert
    assert.equal(target, 'rel');
  });

  test('reads the base from a gh api POST field', () => {
    // Arrange
    const event = bash('gh api repos/a/b/pulls -X POST -f base=dev');
    // Act
    const target = createTarget(event, 'main');
    // Assert
    assert.equal(target, 'dev');
  });

  test('reads the target from glab mr create and glab api', () => {
    // Arrange
    const events = [
      bash('glab mr create -b dev'),
      bash('glab mr new --target-branch=x'),
      bash('glab api projects/1/merge_requests -F target_branch=y')
    ];
    // Act
    const targets = events.map((e) => createTarget(e, 'main'));
    // Assert
    assert.deepEqual(targets, ['dev', 'x', 'y']);
  });

  test('reads the target from an MCP create call', () => {
    // Arrange
    const event = mcp({ title: 't', target_branch: 'dev' });
    // Act
    const target = createTarget(event, 'main');
    // Assert
    assert.equal(target, 'dev');
  });

  test('returns undefined for an MCP update of an existing request', () => {
    // Arrange
    const event = mcp({ merge_request_iid: 3, title: 't' });
    // Act
    const target = createTarget(event, 'main');
    // Assert
    assert.equal(target, undefined);
  });

  test('returns undefined for commands that do not create a request', () => {
    // Arrange
    const commands = ['gh pr view 1', 'glab mr list', 'gh api repos/a/b/pulls', 'echo "gh pr create"'];
    // Act
    const targets = commands.map((c) => createTarget(bash(c), 'main'));
    // Assert
    assert.deepEqual(targets, [undefined, undefined, undefined, undefined]);
  });

  test('returns undefined for a tool other than Bash or the MCP create', () => {
    // Arrange
    const event = { tool_name: 'Read', tool_input: { file_path: 'x' } };
    // Act
    const target = createTarget(event, 'main');
    // Assert
    assert.equal(target, undefined);
  });
});

describe('report', () => {
  test('formats each failure with its fix', () => {
    // Arrange
    const result = { failures: [{ code: 'c1', message: 'm1', fix: 'f1' }] };
    // Act
    const text = report(result);
    // Assert
    assert.equal(text, 'release-check: c1: m1\n  fix: f1');
  });

  test('joins the notes of a skipped result', () => {
    // Arrange
    const result = { skipped: true, notes: ['a', 'b'] };
    // Act
    const text = report(result);
    // Assert
    assert.equal(text, 'a\nb');
  });

  test('returns an empty string when there are no failures', () => {
    // Arrange
    const result = { failures: [], notes: [] };
    // Act
    const text = report(result);
    // Assert
    assert.equal(text, '');
  });
});

describe('runHook', () => {
  const hookDeps = (input, over = {}) => {
    const w = world({ policy: POLICY, ...over.world });
    const state = {};
    const stderr = [];
    const deps = {
      ...w.deps,
      readJsonStdin: async () => {
        const parsed = typeof input === 'string' ? JSON.parse(input) : input;
        if (!parsed || typeof parsed !== 'object') throw new TypeError('hook input is not a JSON object');
        return parsed;
      },
      env: { CLAUDE_PROJECT_DIR: ROOT },
      cwd: () => ROOT,
      statePath: () => 'state-file',
      readState: () => state,
      writeState: (_f, s) => Object.assign(state, s),
      stderr: (t) => stderr.push(t),
      ...over.deps
    };
    return { deps, state, stderr };
  };
  const create = { tool_name: 'Bash', tool_input: { command: 'gh pr create -B main' } };

  test('blocks with exit 2 and the fixes when the checks fail', async () => {
    // Arrange
    const { deps, stderr } = hookDeps(create);
    // Act
    const code = await runHook(deps);
    // Assert
    assert.equal(code, 2);
    assert.match(stderr.join(''), /changelog-unchanged/);
    assert.match(stderr.join(''), /Blocked PR\/MR creation/);
  });

  test('allows and caches the pass when the checks succeed', async () => {
    // Arrange
    const { deps, state } = hookDeps(create, {
      world: { head: { 'plugin.json': pj('1.1.0'), 'CHANGELOG.md': withEntry('Added a.') } }
    });
    // Act
    const code = await runHook(deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(typeof state.pass, 'string');
  });

  test('allows a cached pass without evaluating again', async () => {
    // Arrange
    const first = hookDeps(create, {
      world: { head: { 'plugin.json': pj('1.1.0'), 'CHANGELOG.md': withEntry('Added a.') } }
    });
    await runHook(first.deps);
    const second = hookDeps(create, {
      world: { remote: false },
      deps: { readState: () => first.state }
    });
    // Act
    const code = await runHook(second.deps);
    // Assert
    assert.equal(code, 0);
  });

  test('allows a command that does not create a request', async () => {
    // Arrange
    const { deps } = hookDeps({ tool_name: 'Bash', tool_input: { command: 'git status' } });
    // Act
    const code = await runHook(deps);
    // Assert
    assert.equal(code, 0);
  });

  test('allows when the repo has no release policy', async () => {
    // Arrange
    const { deps } = hookDeps(create, { world: { policy: null } });
    // Act
    const code = await runHook(deps);
    // Assert
    assert.equal(code, 0);
  });

  test('lets invalid stdin bubble so the entry fails closed', async () => {
    // Arrange
    const { deps } = hookDeps('not json');
    // Act
    const act = runHook(deps);
    // Assert
    await assert.rejects(act, SyntaxError);
  });

  test('lets JSON null stdin bubble so the entry fails closed', async () => {
    // Arrange
    const { deps } = hookDeps('null');
    // Act
    const act = runHook(deps);
    // Assert
    await assert.rejects(act, TypeError);
  });

  test('blocks with exit 2 when the policy file is invalid', async () => {
    // Arrange
    const { deps, stderr } = hookDeps(create);
    deps.readFileSync = () => '{ nope';
    // Act
    const code = await runHook(deps);
    // Assert
    assert.equal(code, 2);
    assert.match(stderr.join(''), /invalid \.claude\/release-policy\.json/);
  });
});

describe('main', () => {
  const cli = (argv, over = {}) => {
    const w = world(over.world);
    const logs = [];
    const errors = [];
    const deps = {
      ...w.deps,
      cwd: () => ROOT,
      log: (t) => logs.push(t),
      error: (t) => errors.push(t),
      ...over.deps
    };
    return { run: () => main(argv, deps), logs, errors, files: w.files };
  };
  const good = { world: { head: { 'plugin.json': pj('1.1.0'), 'CHANGELOG.md': withEntry('Added a.') } } };

  test('check exits 0 and prints the level for a passing change', async () => {
    // Arrange
    const c = cli(['check'], good);
    // Act
    const code = await c.run();
    // Assert
    assert.equal(code, 0);
    assert.equal(c.logs[0], 'ok: minor -> 1.1.0');
  });

  test('check --json prints the result object', async () => {
    // Arrange
    const c = cli(['check', '--json'], good);
    // Act
    const code = await c.run();
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(c.logs[0]).required, '1.1.0');
  });

  test('check exits 1 and prints the failures for a failing change', async () => {
    // Arrange
    const c = cli(['check']);
    // Act
    const code = await c.run();
    // Assert
    assert.equal(code, 1);
    assert.match(c.logs[0], /version-unchanged/);
  });

  test('bump writes the version and exits 0', async () => {
    // Arrange
    const c = cli(['bump'], { world: { head: { 'plugin.json': pj('1.0.0'), 'CHANGELOG.md': withEntry('Added a.') } } });
    // Act
    const code = await c.run();
    // Assert
    assert.equal(code, 0);
    assert.equal(c.logs[0], 'level minor: plugin.json 1.0.0 -> 1.1.0');
    assert.equal(c.files['plugin.json'], pj('1.1.0'));
  });

  test('bump exits 1 on a failure it cannot fix', async () => {
    // Arrange
    const c = cli(['bump'], { world: { fetchOk: false } });
    // Act
    const code = await c.run();
    // Assert
    assert.equal(code, 1);
  });

  test('--subject without a path exits 2', async () => {
    // Arrange
    const c = cli(['check', '--subject', '--json']);
    // Act
    const code = await c.run();
    // Assert
    assert.equal(code, 2);
    assert.match(c.errors[0], /--subject needs a file path/);
  });

  test('--subject reads the first line as the pending subject', async () => {
    // Arrange
    const c = cli(['check', '--pre-push', '--subject', 'msg', '--json'], {
      world: { subjects: [] },
      deps: { readFileSync: (p) => (p === 'msg' ? 'feat: add a\nbody' : undefined) }
    });
    c.run = (
      (run) => async () =>
        run()
    )(c.run);
    // Act
    const code = await c.run();
    // Assert
    assert.equal(typeof code, 'number');
  });

  test('prints the error and exits 1 when evaluation throws', async () => {
    // Arrange
    const c = cli(['check'], {
      deps: {
        git: () => {
          throw new Error('boom');
        }
      }
    });
    // Act
    const code = await c.run();
    // Assert
    assert.equal(code, 1);
    assert.equal(c.errors[0], 'release-check: boom');
  });
});
