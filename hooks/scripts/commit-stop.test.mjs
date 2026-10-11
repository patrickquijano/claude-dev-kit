import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('./commit-stop.mjs', import.meta.url));
const sh = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

// Temp repo with one commit and a dirty tree.
function dirtyRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'cs-'));
  sh(dir, 'init', '-q', '-b', 'main');
  sh(dir, 'config', 'user.email', 't@t');
  sh(dir, 'config', 'user.name', 't');
  writeFileSync(path.join(dir, 'a.txt'), 'a\n');
  sh(dir, 'add', '-A');
  sh(dir, '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'chore: init');
  writeFileSync(path.join(dir, 'a.txt'), 'b\n');
  return { dir, done: () => rmSync(dir, { recursive: true, force: true }) };
}
const run = (dir) =>
  spawnSync('node', [SCRIPT], {
    input: JSON.stringify({ session_id: `t-${path.basename(dir)}` }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    encoding: 'utf8'
  });

test('dirty tree without the marker blocks and asks for cdk:commit-changes', () => {
  const r = dirtyRepo();
  try {
    const out = JSON.parse(run(r.dir).stdout);
    assert.equal(out.decision, 'block');
    assert.match(out.reason, /cdk:commit-changes/);
  } finally {
    r.done();
  }
});

test('ship-release marker skips the commit instruction', () => {
  const r = dirtyRepo();
  try {
    writeFileSync(path.join(r.dir, sh(r.dir, 'rev-parse', '--git-path', 'cdk-ship-release')), '');
    const out = JSON.parse(run(r.dir).stdout);
    assert.equal(out.decision, undefined);
    assert.match(out.systemMessage, /ship-release pending/);
  } finally {
    r.done();
  }
});
