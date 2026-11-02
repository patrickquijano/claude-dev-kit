import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  assertScratch,
  delta,
  isSafePath,
  main,
  makeBatches,
  parseDiff,
  resolveBase,
  scope,
  snapshot,
  verify
} from '../../../../../skills/review-code-changes/scripts/diff-manifest.mjs';

const PATCH = [
  'diff --git a/a.js b/a.js',
  'index 1..2 100644',
  '--- a/a.js',
  '+++ b/a.js',
  '@@ -1,2 +1,3 @@',
  ' x',
  '+y',
  ' z',
  '@@ -10 +11,0 @@',
  '-gone',
  ''
].join('\n');

const FILE = { isFile: () => true, size: 10 };
const enoent = () => Object.assign(new Error('missing'), { code: 'ENOENT' });

// Stubbed git: `table` maps the first git argument found in `table` to a stdout string or {status, stdout}.
const gitStub = (table) => (cmd, args) => {
  assert.equal(cmd, 'git');
  const hit = table[args.find((a) => table[a] !== undefined)] ?? '';
  return typeof hit === 'string' ? { status: 0, stdout: hit, stderr: '' } : { stderr: '', ...hit };
};

// Wraps a stubbed git and records the argument list of every call.
const spy = (inner) => {
  const calls = [];
  return {
    calls,
    spawnSync: (cmd, args) => {
      calls.push(args);
      return inner(cmd, args);
    }
  };
};

const fsStub = (files = {}) => {
  const written = {};
  return {
    written,
    readFileSync: (p) => {
      if (p in files) return files[p];
      throw enoent();
    },
    writeFileSync: (p, t) => {
      written[p] = t;
    },
    mkdirSync: () => {},
    makeScratch: () => '/scratch',
    readdirSync: () => [],
    realpathSync: (p) => p,
    rmSync: () => {},
    copyFileSync: () => {},
    lstatSync: () => FILE
  };
};

const scopeTable = {
  'rev-parse': 'abc\n',
  'symbolic-ref': 'origin/main\n',
  branch: 'main\n',
  diff: PATCH,
  'ls-files': ''
};

// Scope git stub whose untracked list is `untracked`; `--no-index` diffs print nothing.
const scopeGit = (untracked = '') => {
  const git = gitStub({ ...scopeTable, 'ls-files': untracked });
  return spy((cmd, args) => (args.includes('--no-index') ? { status: 1, stdout: '', stderr: '' } : git(cmd, args)));
};

const noIndexTargets = (calls) => calls.filter((a) => a.includes('--no-index')).map((a) => a.at(-1));

describe('isSafePath', () => {
  test('accepts a plain relative path', () => {
    // Arrange
    const path = 'src/a-b.test.mjs';
    // Act
    const ok = isSafePath(path);
    // Assert
    assert.equal(ok, true);
  });

  test('accepts a dotfile in a nested directory', () => {
    // Arrange
    const path = 'a/b/.c.json';
    // Act
    const ok = isSafePath(path);
    // Assert
    assert.equal(ok, true);
  });

  test('rejects traversal, leading slash or dash, and odd characters', () => {
    // Arrange
    const paths = ['../x', '/x', '-x', 'a b', 'a;b'];
    // Act
    const results = paths.map(isSafePath);
    // Assert
    assert.deepEqual(results, [false, false, false, false, false]);
  });

  test('rejects an inner or trailing `..`, an empty string, and a non-string', () => {
    // Arrange
    const paths = ['a/../b', 'a/..', '', undefined];
    // Act
    const results = paths.map(isSafePath);
    // Assert
    assert.deepEqual(results, [false, false, false, false]);
  });
});

describe('parseDiff', () => {
  test('reads hunks with new-side start and length', () => {
    // Arrange
    const text = PATCH;
    // Act
    const [file] = parseDiff(text);
    // Assert
    assert.deepEqual(file.hunks, [
      { id: 'a.js:1', newStart: 1, newLines: 3 },
      { id: 'a.js:11', newStart: 11, newLines: 0 }
    ]);
  });

  test('marks binary and deleted files as skipped', () => {
    // Arrange
    const text =
      'diff --git a/b.png b/b.png\nBinary files a/b.png and b/b.png differ\ndiff --git a/d.js b/d.js\ndeleted file mode 100644\n--- a/d.js\n+++ /dev/null\n@@ -1 +0,0 @@\n-x\n';
    // Act
    const files = parseDiff(text);
    // Assert
    assert.deepEqual(
      files.map((f) => [f.path, f.skip]),
      [
        ['b.png', 'binary'],
        ['d.js', 'deleted']
      ]
    );
  });

  test('marks an unsafe path as skipped', () => {
    // Arrange
    const text = 'diff --git a/a b.js b/a b.js\n--- a/a b.js\n+++ b/a b.js\n@@ -1 +1 @@\n-x\n+y\n';
    // Act
    const [file] = parseDiff(text);
    // Assert
    assert.equal(file.skip, 'unsafe path');
  });

  test('ignores text with no diff sections', () => {
    // Arrange
    const text = 'nothing here';
    // Act
    const files = parseDiff(text);
    // Assert
    assert.deepEqual(files, []);
  });
});

describe('makeBatches', () => {
  test('splits at 60 files', () => {
    // Arrange
    const files = Array.from({ length: 61 }, (_, i) => ({ path: `f${i}`, lines: 1 }));
    // Act
    const batches = makeBatches(files);
    // Assert
    assert.deepEqual(
      batches.map((b) => b.length),
      [60, 1]
    );
  });

  test('keeps exactly 60 files in one batch', () => {
    // Arrange
    const files = Array.from({ length: 60 }, (_, i) => ({ path: `f${i}`, lines: 1 }));
    // Act
    const batches = makeBatches(files);
    // Assert
    assert.equal(batches.length, 1);
  });

  test('keeps exactly 3000 lines in one batch', () => {
    // Arrange
    const files = [
      { path: 'a', lines: 1500 },
      { path: 'b', lines: 1500 }
    ];
    // Act
    const batches = makeBatches(files);
    // Assert
    assert.deepEqual(batches, [['a', 'b']]);
  });

  test('gives a file over 3000 lines its own batch', () => {
    // Arrange
    const files = [
      { path: 'a', lines: 10 },
      { path: 'b', lines: 4000 },
      { path: 'c', lines: 10 }
    ];
    // Act
    const batches = makeBatches(files);
    // Assert
    assert.deepEqual(batches, [['a'], ['b'], ['c']]);
  });

  test('starts a new batch at 3001 lines', () => {
    // Arrange
    const files = [
      { path: 'a', lines: 1500 },
      { path: 'b', lines: 1501 }
    ];
    // Act
    const batches = makeBatches(files);
    // Assert
    assert.deepEqual(batches, [['a'], ['b']]);
  });

  test('returns no batch for no files', () => {
    // Arrange
    const files = [];
    // Act
    const batches = makeBatches(files);
    // Assert
    assert.deepEqual(batches, []);
  });
});

describe('resolveBase', () => {
  test('uses HEAD on the default branch', () => {
    // Arrange
    const git = (args) => ({
      status: 0,
      stdout: { 'rev-parse': 'abc\n', 'symbolic-ref': 'origin/main\n', branch: 'main\n' }[args[0]]
    });
    // Act
    const r = resolveBase(git);
    // Assert
    assert.equal(r.base, 'abc');
  });

  test('uses the merge base on a feature branch', () => {
    // Arrange
    const git = (args) => ({
      status: 0,
      stdout: { 'rev-parse': 'abc\n', 'symbolic-ref': 'origin/main\n', branch: 'feat/x\n', 'merge-base': 'def\n' }[
        args[0]
      ]
    });
    // Act
    const r = resolveBase(git);
    // Assert
    assert.equal(r.base, 'def');
  });

  test('falls back to master when origin/HEAD and main are absent', () => {
    // Arrange
    const git = (args) => {
      if (args[0] === 'symbolic-ref') return { status: 128, stdout: '' };
      if (args[0] === 'rev-parse' && args.includes('refs/heads/main')) return { status: 1, stdout: '' };
      return { status: 0, stdout: { 'rev-parse': 'abc\n', branch: 'master\n' }[args[0]] };
    };
    // Act
    const r = resolveBase(git);
    // Assert
    assert.deepEqual([r.base, r.defaultBranch], ['abc', 'master']);
  });

  test('uses HEAD with no default branch when none exists', () => {
    // Arrange
    const git = (args) => {
      if (args[0] === 'symbolic-ref') return { status: 128, stdout: '' };
      if (args.includes('--verify')) return { status: 1, stdout: '' };
      return { status: 0, stdout: { 'rev-parse': 'abc\n', branch: 'feat/x\n' }[args[0]] };
    };
    // Act
    const r = resolveBase(git);
    // Assert
    assert.deepEqual([r.base, r.defaultBranch], ['abc', null]);
  });

  test('throws when no merge base exists', () => {
    // Arrange
    const git = (args) => ({
      status: args[0] === 'merge-base' ? 1 : 0,
      stdout: { 'rev-parse': 'abc\n', 'symbolic-ref': 'origin/main\n', branch: 'feat/x\n' }[args[0]] ?? ''
    });
    // Act
    const act = () => resolveBase(git);
    // Assert
    assert.throws(act, /no merge base/);
  });

  test('throws when no merge base exists with the master fallback', () => {
    // Arrange
    const git = (args) => {
      if (args[0] === 'symbolic-ref') return { status: 128, stdout: '' };
      if (args[0] === 'rev-parse' && args.includes('refs/heads/main')) return { status: 1, stdout: '' };
      if (args[0] === 'merge-base') return { status: 1, stdout: '' };
      return { status: 0, stdout: { 'rev-parse': 'abc\n', branch: 'feat/x\n' }[args[0]] };
    };
    // Act
    const act = () => resolveBase(git);
    // Assert
    assert.throws(act, /no merge base between HEAD and master/);
  });
});

describe('assertScratch', () => {
  test('accepts a sibling directory', () => {
    // Arrange
    const scratch = '/tmp/s';
    // Act
    const act = () => assertScratch('/r', scratch);
    // Assert
    assert.doesNotThrow(act);
  });

  test('accepts a directory inside the root', () => {
    // Arrange
    const scratch = '/r/.scratch';
    // Act
    const act = () => assertScratch('/r', scratch);
    // Assert
    assert.doesNotThrow(act);
  });

  test('rejects the root itself', () => {
    // Arrange
    const scratch = '/r';
    // Act
    const act = () => assertScratch('/r', scratch);
    // Assert
    assert.throws(act, /unsafe --scratch/);
  });

  test('rejects the filesystem root', () => {
    // Arrange
    const scratch = '/';
    // Act
    const act = () => assertScratch('/r', scratch);
    // Assert
    assert.throws(act, /unsafe --scratch/);
  });

  test('rejects an ancestor of the root', () => {
    // Arrange
    const scratch = '/home/u';
    // Act
    const act = () => assertScratch('/home/u/repo', scratch);
    // Assert
    assert.throws(act, /unsafe --scratch/);
  });
});

describe('scope', () => {
  test('returns the manifest with hunks and one batch', () => {
    // Arrange
    const d = { ...fsStub(), spawnSync: gitStub(scopeTable) };
    // Act
    const out = scope(['--root', '/r'], d);
    // Assert
    assert.deepEqual([out.files[0].path, out.batches, out.base], ['a.js', [['a.js']], 'abc']);
  });

  test('writes the manifest and the patch into the scratch directory', () => {
    // Arrange
    const fs = fsStub();
    const d = { ...fs, spawnSync: gitStub(scopeTable) };
    // Act
    scope(['--root', '/r', '--scratch', '/s'], d);
    // Assert
    assert.deepEqual(Object.keys(fs.written).sort(), ['/s/batch-1.txt', '/s/diff.patch', '/s/manifest.json']);
  });

  test('normalizes the root once', () => {
    // Arrange
    const d = { ...fsStub(), spawnSync: gitStub(scopeTable) };
    // Act
    const out = scope(['--root', '/r/sub/..'], d);
    // Assert
    assert.deepEqual([out.root, out.scratch], ['/r', '/scratch']);
  });

  test('is deterministic for the same input', () => {
    // Arrange
    const run = () => scope(['--root', '/r', '--scratch', '/s'], { ...fsStub(), spawnSync: gitStub(scopeTable) });
    const first = run();
    // Act
    const second = run();
    // Assert
    assert.equal(JSON.stringify(second), JSON.stringify(first));
  });

  test('passes fixed prefixes so a mnemonic prefix config cannot change the paths', () => {
    // Arrange
    const { calls, spawnSync } = scopeGit();
    const d = { ...fsStub(), spawnSync };
    // Act
    scope(['--root', '/r'], d);
    // Assert
    const diff = calls.find((a) => a.includes('diff'));
    assert.deepEqual([diff.includes('--src-prefix=a/'), diff.includes('--dst-prefix=b/')], [true, true]);
  });

  test('skips an untracked name that is unsafe as a path and never diffs it', () => {
    // Arrange
    const { calls, spawnSync } = scopeGit('a b.txt\0ok.txt\0');
    const d = { ...fsStub(), spawnSync };
    // Act
    const out = scope(['--root', '/r'], d);
    // Assert
    assert.deepEqual(
      [out.skipped, noIndexTargets(calls)],
      [[{ path: '"a b.txt"', reason: 'unsafe path' }], ['ok.txt']]
    );
  });

  test('skips secret-shaped untracked names and keeps look-alikes', () => {
    // Arrange
    const names = [
      '.ENV',
      '.env',
      '.git-credentials',
      '.netrc',
      '.npmrc',
      '.pgpass',
      '.pypirc',
      'Credentials.json',
      'ID_RSA',
      'a.PEM',
      'a.jks',
      'b.keystore',
      'c.p12',
      'c.pfx',
      'cert.pem',
      'config/.env.local',
      'credentials.json',
      'id_ecdsa',
      'id_ed25519',
      'id_rsa',
      'k.key',
      'prod.tfvars',
      'secrets.yml'
    ];
    const kept = ['.netrc.md', 'environment.md', 'id_card.js', 'keyboard.js', 'secretsauce.md'];
    const { calls, spawnSync } = scopeGit([...names, ...kept].join('\0'));
    const d = { ...fsStub(), spawnSync };
    // Act
    const out = scope(['--root', '/r'], d);
    // Assert
    assert.deepEqual(
      [out.skipped, noIndexTargets(calls)],
      [names.map((path) => ({ path, reason: 'sensitive' })), kept]
    );
  });

  test('drops a tracked secret-shaped change from the patch and never copies it', () => {
    // Arrange
    const envPatch = 'diff --git a/.env b/.env\n--- a/.env\n+++ b/.env\n@@ -1 +1 @@\n-A=1\n+A=2\n';
    const fs = fsStub();
    const copied = [];
    const d = {
      ...fs,
      copyFileSync: (src) => copied.push(src),
      spawnSync: gitStub({ ...scopeTable, diff: PATCH + envPatch })
    };
    // Act
    const out = scope(['--root', '/r', '--scratch', '/s'], d);
    // Assert
    assert.deepEqual(
      [out.skipped, out.files.map((f) => f.path), fs.written['/s/diff.patch'].includes('A=2'), copied],
      [[{ path: '.env', reason: 'sensitive' }], ['a.js'], false, ['/r/a.js']]
    );
  });

  test('drops a tracked secret renamed to a plain name', () => {
    // Arrange
    const renamed =
      'diff --git a/.env b/notes.txt\nsimilarity index 80%\nrename from .env\nrename to notes.txt\n--- a/.env\n+++ b/notes.txt\n@@ -1 +1 @@\n-A=1\n+A=2\n';
    const fs = fsStub();
    const d = { ...fs, spawnSync: gitStub({ ...scopeTable, diff: PATCH + renamed }) };
    // Act
    const out = scope(['--root', '/r', '--scratch', '/s'], d);
    // Assert
    assert.deepEqual([out.files.map((f) => f.path), fs.written['/s/diff.patch'].includes('A=1')], [['a.js'], false]);
  });

  test('drops a plain file renamed to a secret name', () => {
    // Arrange
    const renamed =
      'diff --git a/notes.txt b/.env\nsimilarity index 80%\nrename from notes.txt\nrename to .env\n--- a/notes.txt\n+++ b/.env\n@@ -1 +1 @@\n-A=1\n+A=2\n';
    const fs = fsStub();
    const d = { ...fs, spawnSync: gitStub({ ...scopeTable, diff: PATCH + renamed }) };
    // Act
    const out = scope(['--root', '/r', '--scratch', '/s'], d);
    // Assert
    assert.deepEqual(
      [out.files.map((f) => f.path), out.skipped, fs.written['/s/diff.patch'].includes('A=2')],
      [['a.js'], [{ path: '.env', reason: 'sensitive' }], false]
    );
  });

  test('excludes a section whose header is C-quoted and never keeps it in the patch', () => {
    // Arrange
    const header = 'diff --git "a/q\\"x" "b/q\\"x"';
    const quoted = `${header}\n--- "a/q\\"x"\n+++ "b/q\\"x"\n@@ -1 +1 @@\n-A=1\n+A=2\n`;
    const fs = fsStub();
    const d = { ...fs, spawnSync: gitStub({ ...scopeTable, diff: PATCH + quoted }) };
    // Act
    const out = scope(['--root', '/r', '--scratch', '/s'], d);
    // Assert
    assert.deepEqual(
      [out.files.map((f) => f.path), out.skipped, fs.written['/s/diff.patch'].includes('A=2')],
      [['a.js'], [{ path: header.slice('diff --git '.length), reason: 'unsafe path' }], false]
    );
  });

  test('keeps a section with an unquoted header', () => {
    // Arrange
    const d = { ...fsStub(), spawnSync: gitStub(scopeTable) };
    // Act
    const out = scope(['--root', '/r', '--scratch', '/s'], d);
    // Assert
    assert.deepEqual(out.skipped, []);
  });

  test('excludes an untracked embedded repository as a directory and never diffs it', () => {
    // Arrange
    const { calls, spawnSync } = scopeGit('emb/\0ok.txt\0');
    const d = { ...fsStub(), spawnSync };
    // Act
    const out = scope(['--root', '/r'], d);
    // Assert
    assert.deepEqual([out.skipped, noIndexTargets(calls)], [[{ path: 'emb/', reason: 'directory' }], ['ok.txt']]);
  });

  test('skips an oversized file', () => {
    // Arrange
    const d = {
      ...fsStub(),
      lstatSync: () => ({ isFile: () => true, size: 1_000_001 }),
      spawnSync: gitStub(scopeTable)
    };
    // Act
    const out = scope(['--root', '/r'], d);
    // Assert
    assert.deepEqual([out.files, out.skipped], [[], [{ path: 'a.js', reason: 'oversized' }]]);
  });

  test('keeps a file at the size limit', () => {
    // Arrange
    const d = {
      ...fsStub(),
      lstatSync: () => ({ isFile: () => true, size: 1_000_000 }),
      spawnSync: gitStub(scopeTable)
    };
    // Act
    const out = scope(['--root', '/r'], d);
    // Assert
    assert.deepEqual(
      out.files.map((f) => f.path),
      ['a.js']
    );
  });

  test('removes the batch files a previous manifest lists', () => {
    // Arrange
    const removed = [];
    const d = {
      ...fsStub({ '/s/manifest.json': JSON.stringify({ batches: [['a'], ['b']] }) }),
      rmSync: (p) => removed.push(p),
      spawnSync: gitStub(scopeTable)
    };
    // Act
    scope(['--root', '/r', '--scratch', '/s'], d);
    // Assert
    assert.deepEqual(
      removed.filter((p) => p.includes('batch-')),
      ['/s/batch-1.txt', '/s/batch-2.txt']
    );
  });

  test('throws on a corrupt previous manifest', () => {
    // Arrange
    const d = { ...fsStub({ '/s/manifest.json': '{' }), spawnSync: gitStub(scopeTable) };
    // Act
    const act = () => scope(['--root', '/r', '--scratch', '/s'], d);
    // Assert
    assert.throws(act, SyntaxError);
  });

  test('rejects a scratch path equal to the root before removing anything', () => {
    // Arrange
    const removed = [];
    const d = { ...fsStub(), rmSync: (p) => removed.push(p), spawnSync: gitStub(scopeTable) };
    // Act
    const act = () => scope(['--root', '/r', '--scratch', '/r'], d);
    // Assert
    assert.throws(act, /unsafe --scratch/);
    assert.deepEqual(removed, []);
  });

  test('keeps a tracked look-alike name in the patch', () => {
    // Arrange
    const keyPatch = PATCH.replaceAll('a.js', 'keyboard.js');
    const d = { ...fsStub(), spawnSync: gitStub({ ...scopeTable, diff: keyPatch }) };
    // Act
    const out = scope(['--root', '/r', '--scratch', '/s'], d);
    // Assert
    assert.deepEqual([out.files.map((f) => f.path), out.skipped], [['keyboard.js'], []]);
  });

  test('normalizes a dotted scratch path', () => {
    // Arrange
    const d = { ...fsStub(), spawnSync: gitStub(scopeTable) };
    // Act
    const out = scope(['--root', '/r', '--scratch', '/s/sub/..'], d);
    // Assert
    assert.equal(out.scratch, '/s');
  });

  test('removes delta files a previous run left and tolerates a manifest without batches', () => {
    // Arrange
    const removed = [];
    const d = {
      ...fsStub({ '/s/manifest.json': '{}' }),
      readdirSync: () => ['delta-1.json', 'delta-2-batch-1.txt', 'keep.txt'],
      rmSync: (p) => removed.push(p),
      spawnSync: gitStub(scopeTable)
    };
    // Act
    scope(['--root', '/r', '--scratch', '/s'], d);
    // Assert
    assert.deepEqual(
      removed.filter((p) => p.includes('delta-')),
      ['/s/delta-1.json', '/s/delta-2-batch-1.txt']
    );
  });

  test('skips a file whose real path leaves the root', () => {
    // Arrange
    const d = {
      ...fsStub(),
      realpathSync: (p) => (p === '/r' ? '/r' : '/elsewhere/a.js'),
      spawnSync: gitStub(scopeTable)
    };
    // Act
    const out = scope(['--root', '/r'], d);
    // Assert
    assert.deepEqual(out.skipped, [{ path: 'a.js', reason: 'outside root' }]);
  });

  test('requires --root', () => {
    // Arrange
    const d = { ...fsStub(), spawnSync: gitStub(scopeTable) };
    // Act
    const act = () => scope([], d);
    // Assert
    assert.throws(act, /usage: scope/);
  });

  test('throws when git exits with an unexpected status', () => {
    // Arrange
    const d = { ...fsStub(), spawnSync: () => ({ status: 2, stdout: '', stderr: 'boom' }) };
    // Act
    const act = () => scope(['--root', '/r'], d);
    // Assert
    assert.throws(act, /exited 2/);
  });
});

describe('snapshot', () => {
  const args = ['--root', '/r', '--scratch', '/s', '--paths', '/p.txt'];

  test('lists the copied paths and skips unsafe ones', () => {
    // Arrange
    const d = { ...fsStub({ '/p.txt': 'a.js\n../x\n' }) };
    // Act
    const out = snapshot(args, d);
    // Assert
    assert.deepEqual([out.snapshot, out.skipped[0].reason], [['a.js'], 'unsafe path']);
  });

  test('lists several paths in byte order', () => {
    // Arrange
    const d = { ...fsStub({ '/p.txt': 'b/c.js\na.js\n' }) };
    // Act
    const out = snapshot(args, d);
    // Assert
    assert.deepEqual([out.snapshot, out.skipped], [['a.js', 'b/c.js'], []]);
  });

  test('skips a path that is not a regular file', () => {
    // Arrange
    const d = { ...fsStub({ '/p.txt': 'a.js\n' }), lstatSync: () => ({ isFile: () => false, size: 0 }) };
    // Act
    const out = snapshot(args, d);
    // Assert
    assert.deepEqual(out.skipped, [{ path: 'a.js', reason: 'not a regular file' }]);
  });

  test('records a missing path as deleted', () => {
    // Arrange
    const d = {
      ...fsStub({ '/p.txt': 'a.js\n' }),
      lstatSync: () => {
        throw enoent();
      }
    };
    // Act
    const out = snapshot(args, d);
    // Assert
    assert.deepEqual([out.snapshot, out.skipped], [[], [{ path: 'a.js', reason: 'deleted' }]]);
  });

  test('writes snap.json with the copied and the absent paths', () => {
    // Arrange
    const fs = fsStub({ '/p.txt': 'a.js\nb.js\n' });
    const d = {
      ...fs,
      lstatSync: (p) => {
        if (p === '/r/b.js') throw enoent();
        return FILE;
      }
    };
    // Act
    snapshot(args, d);
    // Assert
    assert.deepEqual(JSON.parse(fs.written['/s/snap.json']), { snapshot: ['a.js'], absent: ['b.js'] });
  });

  test('leaves unsafe and secret-shaped paths out of the absent list', () => {
    // Arrange
    const fs = fsStub({ '/p.txt': '../x\n.env\na.js\n' });
    // Act
    snapshot(args, fs);
    // Assert
    assert.deepEqual(JSON.parse(fs.written['/s/snap.json']), { snapshot: ['a.js'], absent: [] });
  });

  test('rejects a scratch path equal to the root', () => {
    // Arrange
    const d = fsStub({ '/p.txt': 'a.js\n' });
    // Act
    const act = () => snapshot(['--root', '/r', '--scratch', '/r', '--paths', '/p.txt'], d);
    // Assert
    assert.throws(act, /unsafe --scratch/);
  });

  test('skips a path whose real path leaves the root', () => {
    // Arrange
    const d = { ...fsStub({ '/p.txt': 'a.js\n' }), realpathSync: (p) => (p === '/r' ? '/r' : '/elsewhere/a.js') };
    // Act
    const out = snapshot(args, d);
    // Assert
    assert.deepEqual(out.skipped, [{ path: 'a.js', reason: 'outside root' }]);
  });

  test('skips a secret-shaped path and never copies it', () => {
    // Arrange
    const copied = [];
    const d = { ...fsStub({ '/p.txt': '.env\na.js\n' }), copyFileSync: (src) => copied.push(src) };
    // Act
    const out = snapshot(args, d);
    // Assert
    assert.deepEqual(
      [out.snapshot, out.skipped, copied],
      [['a.js'], [{ path: '.env', reason: 'sensitive' }], ['/r/a.js']]
    );
  });

  test('normalizes a dotted scratch path', () => {
    // Arrange
    const dests = [];
    const d = { ...fsStub({ '/p.txt': 'a.js\n' }), copyFileSync: (_src, dest) => dests.push(dest) };
    // Act
    snapshot(['--root', '/r', '--scratch', '/s/sub/..', '--paths', '/p.txt'], d);
    // Assert
    assert.deepEqual(dests, ['/s/snap/a.js']);
  });

  test('requires every option', () => {
    // Arrange
    const d = fsStub();
    // Act
    const act = () => snapshot(['--root', '/r'], d);
    // Assert
    assert.throws(act, /usage: snapshot/);
  });
});

describe('delta', () => {
  const args = ['--root', '/r', '--scratch', '/s', '--paths', '/p.txt', '--round', '2'];
  const noSnapshot = (p) => {
    if (p.startsWith('/s/snap')) throw enoent();
    return FILE;
  };
  const noWorkingFile = (p) => {
    if (p === '/r/a.js') throw enoent();
    return FILE;
  };

  test('writes the delta hunks for the round', () => {
    // Arrange
    const d = { ...fsStub({ '/p.txt': 'a.js\n' }), spawnSync: gitStub({ diff: PATCH }) };
    // Act
    const out = delta(args, d);
    // Assert
    assert.deepEqual([out.round, out.files[0].hunks.length, out.batches], [2, 2, [['a.js']]]);
  });

  test('reports an empty diff as no files', () => {
    // Arrange
    const d = { ...fsStub({ '/p.txt': 'a.js\n' }), spawnSync: gitStub({ diff: '' }) };
    // Act
    const out = delta(args, d);
    // Assert
    assert.deepEqual([out.files, out.batches, out.skipped], [[], [], []]);
  });

  test('diffs against /dev/null when the snapshot recorded the path as absent', () => {
    // Arrange
    const { calls, spawnSync } = spy(gitStub({ diff: PATCH }));
    const snap = JSON.stringify({ snapshot: [], absent: ['a.js'] });
    const d = { ...fsStub({ '/p.txt': 'a.js\n', '/s/snap.json': snap }), lstatSync: noSnapshot, spawnSync };
    // Act
    delta(args, d);
    // Assert
    const diff = calls.find((a) => a.includes('--no-index'));
    const at = diff.indexOf('--no-index');
    assert.deepEqual(diff.slice(at + 1), ['/dev/null', 'a.js']);
  });

  test('excludes a path with no snapshot copy that was not recorded as absent', () => {
    // Arrange
    const { calls, spawnSync } = spy(gitStub({ diff: PATCH }));
    const snap = JSON.stringify({ snapshot: [], absent: ['other.js'] });
    const d = { ...fsStub({ '/p.txt': 'a.js\n', '/s/snap.json': snap }), lstatSync: noSnapshot, spawnSync };
    // Act
    const out = delta(args, d);
    // Assert
    assert.deepEqual([out.skipped, calls.length], [[{ path: 'a.js', reason: 'not snapshotted' }], 0]);
  });

  test('excludes a path with no snapshot copy when snap.json is missing', () => {
    // Arrange
    const d = { ...fsStub({ '/p.txt': 'a.js\n' }), lstatSync: noSnapshot, spawnSync: gitStub({ diff: PATCH }) };
    // Act
    const out = delta(args, d);
    // Assert
    assert.deepEqual(out.skipped, [{ path: 'a.js', reason: 'not snapshotted' }]);
  });

  test('rejects a scratch path that contains the root', () => {
    // Arrange
    const d = { ...fsStub({ '/p.txt': 'a.js\n' }), spawnSync: gitStub({ diff: PATCH }) };
    // Act
    const act = () => delta(['--root', '/s/r', '--scratch', '/s', '--paths', '/p.txt', '--round', '2'], d);
    // Assert
    assert.throws(act, /unsafe --scratch/);
  });

  test('records a file removed from the working tree as deleted', () => {
    // Arrange
    const { calls, spawnSync } = spy(gitStub({ diff: PATCH }));
    const d = { ...fsStub({ '/p.txt': 'a.js\n' }), lstatSync: noWorkingFile, spawnSync };
    // Act
    const out = delta(args, d);
    // Assert
    const diff = calls.find((a) => a.includes('--no-index'));
    assert.deepEqual(
      [diff.slice(-2), out.files, out.skipped],
      [['/s/snap/a.js', '/dev/null'], [], [{ path: 'a.js', reason: 'deleted' }]]
    );
  });

  test('records a path missing on both sides as absent without running git', () => {
    // Arrange
    const { calls, spawnSync } = spy(gitStub({ diff: PATCH }));
    const d = {
      ...fsStub({ '/p.txt': 'a.js\n' }),
      lstatSync: () => {
        throw enoent();
      },
      spawnSync
    };
    // Act
    const out = delta(args, d);
    // Assert
    assert.deepEqual([out.skipped, calls.length], [[{ path: 'a.js', reason: 'absent' }], 0]);
  });

  test('lists an unsafe planned path as skipped and diffs the rest', () => {
    // Arrange
    const d = { ...fsStub({ '/p.txt': '../x\na.js\n' }), spawnSync: gitStub({ diff: PATCH }) };
    // Act
    const out = delta(args, d);
    // Assert
    assert.deepEqual(
      [out.skipped, out.files.map((f) => f.path)],
      [[{ path: '../x', reason: 'unsafe path' }], ['a.js']]
    );
  });

  test('skips a secret-shaped planned path without running git for it', () => {
    // Arrange
    const { calls, spawnSync } = spy(gitStub({ diff: PATCH }));
    const d = { ...fsStub({ '/p.txt': '.env\na.js\n' }), spawnSync };
    // Act
    const out = delta(args, d);
    // Assert
    assert.deepEqual([out.skipped, noIndexTargets(calls)], [[{ path: '.env', reason: 'sensitive' }], ['a.js']]);
  });

  test('skips a planned path whose real path leaves the root without running git', () => {
    // Arrange
    const { calls, spawnSync } = spy(gitStub({ diff: PATCH }));
    const d = {
      ...fsStub({ '/p.txt': 'a.js\n' }),
      realpathSync: (p) => (p === '/r' ? '/r' : '/elsewhere/a.js'),
      spawnSync
    };
    // Act
    const out = delta(args, d);
    // Assert
    assert.deepEqual([out.skipped, calls.length], [[{ path: 'a.js', reason: 'outside root' }], 0]);
  });

  test('normalizes a dotted scratch path', () => {
    // Arrange
    const fs = fsStub({ '/p.txt': 'a.js\n' });
    const d = { ...fs, spawnSync: gitStub({ diff: PATCH }) };
    // Act
    delta(['--root', '/r', '--scratch', '/s/sub/..', '--paths', '/p.txt', '--round', '2'], d);
    // Assert
    assert.deepEqual(Object.keys(fs.written).sort(), ['/s/delta-2-batch-1.txt', '/s/delta-2.json', '/s/delta-2.patch']);
  });

  test('removes the batch files an earlier run of the round wrote', () => {
    // Arrange
    const removed = [];
    const d = {
      ...fsStub({ '/p.txt': 'a.js\n' }),
      readdirSync: () => ['delta-2-batch-1.txt', 'delta-2-batch-2.txt', 'delta-3-batch-1.txt'],
      rmSync: (p) => removed.push(p),
      spawnSync: gitStub({ diff: PATCH })
    };
    // Act
    delta(args, d);
    // Assert
    assert.deepEqual(removed, ['/s/delta-2-batch-1.txt', '/s/delta-2-batch-2.txt']);
  });

  test('rejects a non-numeric round', () => {
    // Arrange
    const d = { ...fsStub({ '/p.txt': 'a.js\n' }), spawnSync: gitStub({}) };
    // Act
    const act = () => delta(['--root', '/r', '--scratch', '/s', '--paths', '/p.txt', '--round', 'x'], d);
    // Assert
    assert.throws(act, /usage: delta/);
  });

  test('requires --paths', () => {
    // Arrange
    const d = { ...fsStub(), spawnSync: gitStub({}) };
    // Act
    const act = () => delta(['--root', '/r', '--scratch', '/s', '--round', '2'], d);
    // Assert
    assert.throws(act, /usage: delta/);
  });
});

describe('verify', () => {
  const manifest = JSON.stringify({ head: 'abc', files: [{ path: 'a.js' }] });
  const args = ['--root', '/r', '--scratch', '/s', '--paths', '/p.txt'];
  const git = gitStub({ 'rev-parse': 'abc\n' });

  test('passes when HEAD and the file are unchanged', () => {
    // Arrange
    const d = {
      ...fsStub({ '/s/manifest.json': manifest, '/p.txt': 'a.js\n', '/r/a.js': 'same', '/s/head/a.js': 'same' }),
      spawnSync: git
    };
    // Act
    const out = verify(args, d);
    // Assert
    assert.equal(out.ok, true);
  });

  test('passes for an empty path list', () => {
    // Arrange
    const d = { ...fsStub({ '/s/manifest.json': manifest, '/p.txt': '' }), spawnSync: git };
    // Act
    const out = verify(args, d);
    // Assert
    assert.deepEqual([out.ok, out.drifted], [true, []]);
  });

  test('ignores a path that was not in the reviewed diff', () => {
    // Arrange
    const d = { ...fsStub({ '/s/manifest.json': manifest, '/p.txt': 'new.js\n' }), spawnSync: git };
    // Act
    const out = verify(args, d);
    // Assert
    assert.deepEqual([out.ok, out.drifted], [true, []]);
  });

  test('flags a path outside the round-1 manifest whose head copy changed', () => {
    // Arrange
    const d = {
      ...fsStub({ '/s/manifest.json': manifest, '/p.txt': 'new.js\n', '/r/new.js': 'new', '/s/head/new.js': 'old' }),
      spawnSync: git
    };
    // Act
    const out = verify(args, d);
    // Assert
    assert.deepEqual(out.drifted, [{ path: 'new.js', reason: 'changed since review' }]);
  });

  test('passes a path outside the round-1 manifest whose head copy matches', () => {
    // Arrange
    const d = {
      ...fsStub({ '/s/manifest.json': manifest, '/p.txt': 'new.js\n', '/r/new.js': 'same', '/s/head/new.js': 'same' }),
      spawnSync: git
    };
    // Act
    const out = verify(args, d);
    // Assert
    assert.deepEqual([out.ok, out.drifted], [true, []]);
  });

  test('rejects a scratch path equal to the filesystem root', () => {
    // Arrange
    const d = { ...fsStub({ '/manifest.json': manifest, '/p.txt': '' }), spawnSync: git };
    // Act
    const act = () => verify(['--root', '/r', '--scratch', '/', '--paths', '/p.txt'], d);
    // Assert
    assert.throws(act, /unsafe --scratch/);
  });

  test('flags a file that changed since review', () => {
    // Arrange
    const d = {
      ...fsStub({ '/s/manifest.json': manifest, '/p.txt': 'a.js\n', '/r/a.js': 'new', '/s/head/a.js': 'old' }),
      spawnSync: git
    };
    // Act
    const out = verify(args, d);
    // Assert
    assert.deepEqual(out.drifted, [{ path: 'a.js', reason: 'changed since review' }]);
  });

  test('flags a reviewed file that was deleted', () => {
    // Arrange
    const d = { ...fsStub({ '/s/manifest.json': manifest, '/p.txt': 'a.js\n' }), spawnSync: git };
    // Act
    const out = verify(args, d);
    // Assert
    assert.deepEqual([out.ok, out.drifted], [false, [{ path: 'a.js', reason: 'deleted' }]]);
  });

  test('flags an unsafe path', () => {
    // Arrange
    const d = { ...fsStub({ '/s/manifest.json': manifest, '/p.txt': '../x\n' }), spawnSync: git };
    // Act
    const out = verify(args, d);
    // Assert
    assert.deepEqual(out.drifted, [{ path: '../x', reason: 'unsafe path' }]);
  });

  test('flags a file whose real path leaves the root', () => {
    // Arrange
    const d = {
      ...fsStub({ '/s/manifest.json': manifest, '/p.txt': 'a.js\n', '/r/a.js': 'same', '/s/head/a.js': 'same' }),
      realpathSync: (p) => (p === '/r' ? '/r' : '/elsewhere/a.js'),
      spawnSync: git
    };
    // Act
    const out = verify(args, d);
    // Assert
    assert.deepEqual(out.drifted, [{ path: 'a.js', reason: 'outside root' }]);
  });

  test('normalizes a dotted scratch path', () => {
    // Arrange
    const d = { ...fsStub({ '/s/manifest.json': manifest, '/p.txt': '' }), spawnSync: git };
    // Act
    const out = verify(['--root', '/r', '--scratch', '/s/sub/..', '--paths', '/p.txt'], d);
    // Assert
    assert.equal(out.ok, true);
  });

  test('flags a moved HEAD', () => {
    // Arrange
    const d = {
      ...fsStub({ '/s/manifest.json': manifest, '/p.txt': '' }),
      spawnSync: gitStub({ 'rev-parse': 'zzz\n' })
    };
    // Act
    const out = verify(args, d);
    // Assert
    assert.deepEqual([out.ok, out.headMoved], [false, true]);
  });

  test('requires every option', () => {
    // Arrange
    const d = fsStub();
    // Act
    const act = () => verify(['--root', '/r'], d);
    // Assert
    assert.throws(act, /usage: verify/);
  });
});

describe('main', () => {
  test('prints the command result as JSON and exits 0', () => {
    // Arrange
    const logs = [];
    const d = {
      ...fsStub({ '/s/manifest.json': JSON.stringify({ head: 'abc', files: [] }), '/p.txt': '' }),
      spawnSync: gitStub({ 'rev-parse': 'abc\n' }),
      log: (t) => logs.push(t)
    };
    // Act
    const code = main(['verify', '--root', '/r', '--scratch', '/s', '--paths', '/p.txt'], d);
    // Assert
    assert.deepEqual([code, JSON.parse(logs[0]).ok], [0, true]);
  });

  test('runs scope and prints its manifest', () => {
    // Arrange
    const logs = [];
    const d = { ...fsStub(), spawnSync: gitStub(scopeTable), log: (t) => logs.push(t) };
    // Act
    const code = main(['scope', '--root', '/r'], d);
    // Assert
    assert.deepEqual([code, JSON.parse(logs[0]).files[0].path], [0, 'a.js']);
  });

  test('prints usage and exits 2 for an unknown command', () => {
    // Arrange
    const errors = [];
    // Act
    const code = main(['nope'], { error: (t) => errors.push(t) });
    // Assert
    assert.deepEqual([code, errors.length], [2, 1]);
  });

  test('prints usage and exits 2 for no command', () => {
    // Arrange
    const errors = [];
    // Act
    const code = main([], { error: (t) => errors.push(t) });
    // Assert
    assert.deepEqual([code, errors.length], [2, 1]);
  });

  test('lets a command error propagate', () => {
    // Arrange
    const d = { ...fsStub(), spawnSync: gitStub(scopeTable), log: () => {} };
    // Act
    const act = () => main(['scope'], d);
    // Assert
    assert.throws(act, /usage: scope/);
  });
});
