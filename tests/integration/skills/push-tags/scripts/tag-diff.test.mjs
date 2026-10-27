import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../../../../skills/push-tags/scripts/tag-diff.mjs', import.meta.url));
const run = (...args) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', timeout: 15_000 });
const git = (cwd, ...args) => {
  const res = spawnSync(
    'git',
    [
      '-c',
      'user.name=t',
      '-c',
      'user.email=t@example.com',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'tag.gpgsign=false',
      ...args
    ],
    { cwd, encoding: 'utf8', timeout: 15_000 }
  );
  assert.equal(res.status, 0, res.stderr);
  return res.stdout.trim();
};

describe('tag-diff CLI', () => {
  let dir;
  let repo;
  let bare;
  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'tag-diff-'));
    repo = join(dir, 'repo');
    bare = join(dir, 'remote.git');
    git(dir, 'init', '-q', '--bare', bare);
    git(dir, 'init', '-q', repo);
    git(repo, 'remote', 'add', 'origin', bare);
    writeFileSync(join(repo, 'a.txt'), 'a');
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'one');
    git(repo, 'tag', 'light');
    git(repo, 'tag', '-a', 'annotated', '-m', 'annotated');
    git(repo, 'tag', 'clash');
    git(repo, 'push', '-q', 'origin', 'HEAD:refs/heads/main');
    writeFileSync(join(repo, 'a.txt'), 'b');
    git(repo, 'commit', '-q', '-am', 'two');
    // The remote gets `clash` on the second commit; locally it stays on the first.
    git(repo, 'push', '-q', 'origin', 'HEAD:refs/heads/main');
    git(bare, 'tag', 'clash', git(repo, 'rev-parse', 'HEAD'));
  });
  after(() => rmSync(dir, { recursive: true, force: true }));

  test('reports unpushed tags and the mismatch', () => {
    // Act
    const res = run(repo, 'origin');
    // Assert
    assert.equal(res.status, 0);
    const out = JSON.parse(res.stdout);
    assert.deepEqual(
      out.unpushed.map((t) => t.tag),
      ['annotated', 'light']
    );
    assert.deepEqual(
      out.mismatches.map((t) => t.tag),
      ['clash']
    );
    assert.deepEqual(out.remoteTags, ['clash']);
    assert.equal(out.unpushed[0].commit, git(repo, 'rev-parse', 'annotated^{commit}'));
  });

  test('shows pushed tags on the remote after an explicit push', () => {
    // Arrange
    git(repo, 'push', '-q', 'origin', 'refs/tags/light', 'refs/tags/annotated');
    // Act
    const res = run(repo, 'origin');
    // Assert
    const out = JSON.parse(res.stdout);
    assert.deepEqual(out.unpushed, []);
    assert.deepEqual(out.remoteTags, ['annotated', 'clash', 'light']);
    assert.equal(out.mismatches.length, 1);
  });

  test('exits 1 with remote-error for an unreachable remote', () => {
    // Act
    const res = run(repo, join(dir, 'missing.git'));
    // Assert
    assert.equal(res.status, 1);
    assert.equal(JSON.parse(res.stdout).code, 'remote-error');
  });

  test('exits 2 with usage on missing arguments', () => {
    // Act
    const res = run(repo);
    // Assert
    assert.equal(res.status, 2);
    assert.match(res.stderr, /usage/);
  });
});
