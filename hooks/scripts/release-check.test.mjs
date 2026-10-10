import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { bump, createTarget, evaluate, levelOf, segments } from './release-check.mjs';

const SCRIPT = fileURLToPath(new URL('./release-check.mjs', import.meta.url));
const POLICY = {
  changelog: 'CHANGELOG.md',
  defaultBranch: 'main',
  remote: 'origin',
  versionFiles: [{ path: 'plugin.json', key: 'version' }],
  userFacing: ['skills/**'],
  exempt: [{ glob: 'skills/docs/**', reason: 'docs only' }]
};
const CHANGELOG = '# Changelog\n\n## [Unreleased]\n\n## [0.1.0] - 2026-01-01\n\n- first\n';

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

// Repo with bare origin, `main` at 0.1.0, and a feature branch checked out.
function repo({ policy = POLICY } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'rc-'));
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
  return { dir, work, bare, done: () => rmSync(dir, { recursive: true, force: true }) };
}
const codes = (r) => r.failures.map((f) => f.code).sort();
const push = (w) => sh(w, 'push', '-q', '-u', 'origin', 'feat/x');
const withChangelog = (line) => CHANGELOG.replace('## [Unreleased]\n', `## [Unreleased]\n\n- ${line}\n`);

test('levelOf: breaking, feat, other', () => {
  const c = (subject, body = '') => ({ subject, body });
  assert.equal(levelOf([c('fix: a'), c('feat(x): b')]), 'minor');
  assert.equal(levelOf([c('fix: a'), c('refactor!: b')]), 'major');
  assert.equal(levelOf([c('fix: a', 'BREAKING CHANGE: x')]), 'major');
  assert.equal(levelOf([c('docs: a'), c('fix: b')]), 'patch');
});

test('no policy: skipped in every mode', () => {
  const r = repo({ policy: null });
  try {
    assert.equal(evaluate(r.work).skipped, true);
    assert.deepEqual(bump(r.work).changed, []);
    const hook = spawnSync('node', [SCRIPT, 'hook'], {
      input: JSON.stringify({ tool_name: 'Bash', cwd: r.work, tool_input: { command: 'gh pr create' } })
    });
    assert.equal(hook.status, 0);
  } finally {
    r.done();
  }
});

test('exempt-only change is skipped with the reason noted', () => {
  const r = repo();
  try {
    commit(r.work, { 'skills/docs/a.md': 'a\n' }, 'feat: docs');
    const res = evaluate(r.work);
    assert.equal(res.ok, true);
    assert.equal(res.skipped, true);
    assert.ok(res.notes.some((n) => n.includes('docs only')));
  } finally {
    r.done();
  }
});

test('feat without changelog or version fails both', () => {
  const r = repo();
  try {
    commit(r.work, { 'skills/a/SKILL.md': 'a\n' }, 'feat: add a');
    push(r.work);
    assert.deepEqual(codes(evaluate(r.work)), ['changelog-unchanged', 'version-unchanged']);
  } finally {
    r.done();
  }
});

test('feat with entry and minor bump passes; repeat run passes too', () => {
  const r = repo();
  try {
    commit(
      r.work,
      { 'skills/a/SKILL.md': 'a\n', 'CHANGELOG.md': withChangelog('Added a.'), 'plugin.json': pj('0.2.0') },
      'feat: add a'
    );
    push(r.work);
    for (let i = 0; i < 2; i++) {
      const res = evaluate(r.work);
      assert.deepEqual(res.failures, []);
      assert.equal(res.required, '0.2.0');
    }
  } finally {
    r.done();
  }
});

test('fix requires patch; minor is over-bumped', () => {
  const r = repo();
  try {
    commit(
      r.work,
      { 'skills/a/SKILL.md': 'a\n', 'CHANGELOG.md': withChangelog('Fixed a.'), 'plugin.json': pj('0.2.0') },
      'fix: a'
    );
    push(r.work);
    assert.deepEqual(codes(evaluate(r.work)), ['version-over-bumped']);
  } finally {
    r.done();
  }
});

test('breaking change requires major', () => {
  const r = repo();
  try {
    commit(
      r.work,
      { 'skills/a/SKILL.md': 'a\n', 'CHANGELOG.md': withChangelog('Changed a.'), 'plugin.json': pj('0.2.0') },
      'feat!: break a'
    );
    push(r.work);
    const res = evaluate(r.work);
    assert.equal(res.required, '1.0.0');
    assert.deepEqual(codes(res), ['version-lower']);
  } finally {
    r.done();
  }
});

test('duplicate Unreleased entry and inconsistent or invalid versions', () => {
  const policy = { ...POLICY, versionFiles: [...POLICY.versionFiles, { path: 'other.json', key: 'version' }] };
  const r = repo({ policy });
  try {
    commit(r.work, { 'other.json': pj('0.1.0') }, 'chore: other');
    sh(r.work, 'push', '-q', 'origin', 'main');
    commit(
      r.work,
      {
        'skills/a/SKILL.md': 'a\n',
        'CHANGELOG.md': withChangelog('Added a.\n- Added  A.'),
        'plugin.json': pj('0.2.0')
      },
      'feat: a'
    );
    push(r.work);
    assert.deepEqual(codes(evaluate(r.work)), ['changelog-duplicate', 'version-inconsistent']);
    commit(r.work, { 'other.json': '{"version":"bad"}' }, 'fix: other');
    push(r.work);
    assert.ok(codes(evaluate(r.work)).includes('version-invalid'));
  } finally {
    r.done();
  }
});

test('release section in the diff satisfies the changelog', () => {
  const r = repo();
  try {
    const cl =
      '# Changelog\n\n## [Unreleased]\n\n## [0.2.0] - 2026-02-01\n\n- added a\n\n## [0.1.0] - 2026-01-01\n\n- first\n';
    commit(r.work, { 'skills/a/SKILL.md': 'a\n', 'CHANGELOG.md': cl, 'plugin.json': pj('0.2.0') }, 'feat: a');
    push(r.work);
    assert.deepEqual(evaluate(r.work).failures, []);
  } finally {
    r.done();
  }
});

test('missing changelog file', () => {
  const r = repo();
  try {
    commit(r.work, { 'skills/a/SKILL.md': 'a\n', 'plugin.json': pj('0.2.0') }, 'feat: a');
    sh(r.work, 'rm', '-q', 'CHANGELOG.md');
    sh(r.work, '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'chore: drop changelog');
    push(r.work);
    assert.deepEqual(codes(evaluate(r.work)), ['changelog-missing']);
  } finally {
    r.done();
  }
});

test('dirty generated files are uncommitted; unpushed unless --pre-push', () => {
  const r = repo();
  try {
    commit(
      r.work,
      { 'skills/a/SKILL.md': 'a\n', 'CHANGELOG.md': withChangelog('Added a.'), 'plugin.json': pj('0.2.0') },
      'feat: a'
    );
    assert.deepEqual(codes(evaluate(r.work)), ['unpushed']);
    assert.deepEqual(evaluate(r.work, { prePush: true }).failures, []);
    push(r.work);
    write(r.work, 'CHANGELOG.md', `${withChangelog('Added a.')}\n- more\n`);
    assert.deepEqual(codes(evaluate(r.work)), ['uncommitted']);
  } finally {
    r.done();
  }
});

test('missing remote, bad target, and detached HEAD', () => {
  const r = repo();
  try {
    commit(r.work, { 'skills/a/SKILL.md': 'a\n' }, 'feat: a');
    assert.deepEqual(codes(evaluate(r.work, { target: 'nope' })), ['fetch-failed']);
    sh(r.work, 'checkout', '-q', '--detach');
    assert.deepEqual(codes(evaluate(r.work)), ['unsafe-state']);
    assert.notDeepEqual(codes(evaluate(r.work, { ci: true })), ['unsafe-state']);
    sh(r.work, 'checkout', '-q', 'feat/x');
    sh(r.work, 'remote', 'remove', 'origin');
    assert.deepEqual(codes(evaluate(r.work)), ['no-remote']);
  } finally {
    r.done();
  }
});

test('target advanced (rebase): required version moves, bump fixes it, bump is idempotent', () => {
  const r = repo();
  try {
    commit(
      r.work,
      { 'skills/a/SKILL.md': 'a\n', 'CHANGELOG.md': withChangelog('Added a.'), 'plugin.json': pj('0.2.0') },
      'feat: a'
    );
    push(r.work);
    assert.deepEqual(evaluate(r.work).failures, []);

    sh(r.work, 'checkout', '-q', 'main');
    commit(r.work, { 'plugin.json': pj('0.2.0') }, 'chore(release): bump version to 0.2.0');
    sh(r.work, 'push', '-q', 'origin', 'main');
    sh(r.work, 'checkout', '-q', 'feat/x');
    sh(r.work, '-c', 'commit.gpgsign=false', 'rebase', '-q', 'main');
    write(r.work, 'plugin.json', pj('0.2.0'));
    assert.ok(codes(evaluate(r.work, { prePush: true })).includes('version-unchanged'));

    const first = bump(r.work);
    assert.deepEqual(first.changed, [{ path: 'plugin.json', from: '0.2.0', to: '0.3.0' }]);
    assert.equal(readFileSync(path.join(r.work, 'plugin.json'), 'utf8'), pj('0.3.0'));
    assert.deepEqual(bump(r.work).changed, []);
  } finally {
    r.done();
  }
});

test('createTarget covers gh, glab, api, MCP create vs update, chaining, and non-creates', () => {
  const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
  assert.equal(createTarget(bash('gh pr create -t x'), 'main'), 'main');
  assert.equal(createTarget(bash('gh pr create --base=dev -t "a && b"'), 'main'), 'dev');
  assert.equal(createTarget(bash('cd x && GH_TOKEN=1 gh -R a/b pr create -B rel'), 'main'), 'rel');
  assert.equal(createTarget(bash('gh api repos/a/b/pulls -X POST -f base=dev'), 'main'), 'dev');
  assert.equal(createTarget(bash('gh api repos/a/b/pulls'), 'main'), undefined);
  assert.equal(createTarget(bash('gh pr view 1'), 'main'), undefined);
  assert.equal(createTarget(bash('glab mr create -b dev'), 'main'), 'dev');
  assert.equal(createTarget(bash('glab mr new --target-branch=x'), 'main'), 'x');
  assert.equal(createTarget(bash('glab api projects/1/merge_requests -F target_branch=dev'), 'main'), 'dev');
  assert.equal(createTarget(bash('glab mr list'), 'main'), undefined);
  assert.equal(createTarget(bash('echo "gh pr create"'), 'main'), undefined);
  const mcp = (tool_input) => ({ tool_name: 'mcp__plugin_gitlab_gitlab__save_merge_request', tool_input });
  assert.equal(createTarget(mcp({ title: 't', target_branch: 'dev' }), 'main'), 'dev');
  assert.equal(createTarget(mcp({ merge_request_iid: 3, title: 't' }), 'main'), undefined);
  assert.deepEqual(segments('a && b | c; d'), [['a'], ['b'], ['c'], ['d']]);
});

test('hook blocks with exit 2 until fixed, then allows and caches', () => {
  const r = repo();
  const run = (input) => spawnSync('node', [SCRIPT, 'hook'], { input: JSON.stringify(input), encoding: 'utf8' });
  const event = { tool_name: 'Bash', cwd: r.work, tool_input: { command: 'gh pr create -B main' } };
  try {
    commit(r.work, { 'skills/a/SKILL.md': 'a\n' }, 'feat: a');
    push(r.work);
    const blocked = run(event);
    assert.equal(blocked.status, 2);
    assert.match(blocked.stderr, /changelog-unchanged/);
    assert.match(blocked.stderr, /version-unchanged/);
    assert.equal(run({ ...event, tool_input: { command: 'git status' } }).status, 0);

    commit(r.work, { 'CHANGELOG.md': withChangelog('Added a.'), 'plugin.json': pj('0.2.0') }, 'chore: release files');
    push(r.work);
    assert.equal(run(event).status, 0);
    assert.equal(run(event).status, 0);
  } finally {
    r.done();
  }
});

test('ci mode uses the existing remote ref without fetching', () => {
  const r = repo();
  try {
    commit(
      r.work,
      { 'skills/a/SKILL.md': 'a\n', 'CHANGELOG.md': withChangelog('Added a.'), 'plugin.json': pj('0.2.0') },
      'feat: a'
    );
    sh(r.work, 'remote', 'set-url', 'origin', path.join(r.dir, 'gone.git'));
    assert.deepEqual(codes(evaluate(r.work)), ['fetch-failed']);
    assert.deepEqual(evaluate(r.work, { ci: true }).failures, []);
  } finally {
    r.done();
  }
});
