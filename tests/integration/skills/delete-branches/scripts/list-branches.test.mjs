import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(
  new URL('../../../../../skills/delete-branches/scripts/list-branches.mjs', import.meta.url)
);
const run = (...args) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', timeout: 15_000 });
const git = (cwd, ...args) => {
  const res = spawnSync(
    'git',
    ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args],
    {
      cwd,
      encoding: 'utf8',
      timeout: 15_000
    }
  );
  assert.equal(res.status, 0, res.stderr);
  return res.stdout.trim();
};

describe('list-branches CLI', () => {
  let dir;
  let repo;
  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'list-branches-'));
    const bare = join(dir, 'remote.git');
    repo = join(dir, 'repo');
    git(dir, 'init', '-q', '--bare', bare);
    git(dir, 'init', '-q', '-b', 'main', repo);
    git(repo, 'remote', 'add', 'origin', bare);
    writeFileSync(join(repo, 'a.txt'), 'a');
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'one');
    git(repo, 'branch', 'feat/a');
    git(repo, 'branch', 'release/1');
    git(repo, 'push', '-q', 'origin', 'main', 'feat/a', 'release/1');
    git(repo, 'branch', '-q', '--set-upstream-to=origin/feat/a', 'feat/a');
    git(repo, 'branch', 'local-only');
    // The remote branch behind `feat/a` goes away; the next fetch --prune leaves the local upstream marked gone.
    git(repo, 'branch', 'gone-soon');
    git(repo, 'push', '-q', '-u', 'origin', 'gone-soon');
    git(repo, 'push', '-q', 'origin', '--delete', 'gone-soon');
    git(repo, 'fetch', '-q', '--prune');
  });
  after(() => rmSync(dir, { recursive: true, force: true }));

  test('lists local candidates with tracking descriptions and excludes protected names', () => {
    // Act
    const res = run(repo, 'local', 'origin', '--protected', 'main', '--protected', 'release/*');
    // Assert
    assert.equal(res.status, 0);
    const out = JSON.parse(res.stdout);
    assert.deepEqual(
      out.candidates.map((c) => c.name),
      ['feat/a', 'gone-soon', 'local-only']
    );
    assert.deepEqual(out.excluded, ['main', 'release/1']);
    const byName = Object.fromEntries(out.candidates.map((c) => [c.name, c.description]));
    assert.match(byName['gone-soon'], /^upstream gone/);
    assert.match(byName['local-only'], /^no upstream/);
    assert.match(byName['feat/a'], /^in sync with origin\/feat\/a/);
  });

  test('lists remote-tracking candidates without HEAD', () => {
    // Act
    const res = run(repo, 'remote', 'origin', '--protected', 'main');
    // Assert
    assert.equal(res.status, 0);
    const out = JSON.parse(res.stdout);
    assert.deepEqual(
      out.candidates.map((c) => c.name),
      ['feat/a', 'release/1']
    );
    assert.equal(out.pages[0][0].options.length, 2);
  });

  test('exits 1 with git-error outside a repository', () => {
    // Act
    const res = run(dir, 'local');
    // Assert
    assert.equal(res.status, 1);
    assert.equal(JSON.parse(res.stdout).code, 'git-error');
  });

  test('exits 2 with usage when remote mode has no remote', () => {
    // Act
    const res = run(repo, 'remote');
    // Assert
    assert.equal(res.status, 2);
    assert.match(res.stderr, /usage/);
  });
});
