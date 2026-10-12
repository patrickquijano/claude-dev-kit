import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';
import {
  checkMessage,
  commentChar,
  expandHome,
  gitConfig,
  headerLengthError,
  imperativeError,
  main,
  packageManager,
  parseArgs,
  publicKey,
  readSubject,
  report,
  runCommitlint,
  signingError
} from '../../../.husky/commit-msg.mjs';

const PKG = '/pkg';
const PUB = 'ssh-ed25519 AAAAkey';

// Builds stub deps. `config` maps a git config key to its value; `files` maps a path to its content (also "exists").
// `lint` is the commitlint spawn result; `root` is the git toplevel.
function makeDeps({
  config = {},
  files = {},
  lint = { status: 0, stdout: '', stderr: '' },
  root = '',
  isWindows = false
} = {}) {
  const logged = [];
  const errors = [];
  const spawned = [];
  const deps = {
    spawn: (cmd, args, opts) => {
      spawned.push({ cmd, args, opts });
      if (cmd === 'git' && args[0] === 'config') {
        return args[2] in config ? { status: 0, stdout: `${config[args[2]]}\n` } : { status: 1, stdout: '' };
      }
      if (cmd === 'git' && args[0] === 'rev-parse') return { status: 0, stdout: `${root}\n` };
      return lint;
    },
    readFile: (path) => {
      if (!(path in files)) throw Object.assign(new Error(`ENOENT ${path}`), { code: 'ENOENT' });
      return files[path];
    },
    exists: (path) => path in files,
    home: () => '/home/u',
    isWindows,
    packageDir: PKG,
    log: (line) => logged.push(line),
    error: (line) => errors.push(line)
  };
  return { deps, logged, errors, spawned };
}

const goodSigning = {
  'commit.gpgsign': 'true',
  'user.signingkey': PUB,
  'gpg.format': 'ssh',
  'gpg.ssh.allowedSignersFile': '/allowed'
};

describe('gitConfig', () => {
  test('returns the trimmed value when the key is set', () => {
    // Arrange
    const { deps } = makeDeps({ config: { 'user.name': 'Ada' } });
    // Act
    const result = gitConfig('user.name', deps);
    // Assert
    assert.equal(result, 'Ada');
  });

  test('queries git with an argument array', () => {
    // Arrange
    const { deps, spawned } = makeDeps({ config: { a: 'b' } });
    // Act
    gitConfig('a', deps);
    // Assert
    assert.deepEqual(spawned[0].args, ['config', '--get', 'a']);
  });

  test('returns an empty string when the key is unset', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = gitConfig('missing', deps);
    // Assert
    assert.equal(result, '');
  });

  test('returns an empty string when git exits non-zero with output', () => {
    // Arrange
    const { deps } = makeDeps();
    deps.spawn = () => ({ status: 128, stdout: 'fatal' });
    // Act
    const result = gitConfig('x', deps);
    // Assert
    assert.equal(result, '');
  });
});

describe('commentChar', () => {
  test('returns a single-character core.commentChar', () => {
    // Arrange
    const { deps } = makeDeps({ config: { 'core.commentChar': ';' } });
    // Act
    const result = commentChar(deps);
    // Assert
    assert.equal(result, ';');
  });

  test('returns the value for another single character', () => {
    // Arrange
    const { deps } = makeDeps({ config: { 'core.commentChar': '%' } });
    // Act
    const result = commentChar(deps);
    // Assert
    assert.equal(result, '%');
  });

  test('defaults to # when unset', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = commentChar(deps);
    // Assert
    assert.equal(result, '#');
  });

  test('defaults to # for a multi-character value such as auto', () => {
    // Arrange
    const { deps } = makeDeps({ config: { 'core.commentChar': 'auto' } });
    // Act
    const result = commentChar(deps);
    // Assert
    assert.equal(result, '#');
  });
});

describe('readSubject', () => {
  test('returns the first non-comment line, trimmed', () => {
    // Arrange
    const { deps } = makeDeps({ files: { '/m': '# note\n\n  feat: add x  \nbody\n' } });
    // Act
    const result = readSubject('/m', deps);
    // Assert
    assert.equal(result, 'feat: add x');
  });

  test('handles CRLF line endings', () => {
    // Arrange
    const { deps } = makeDeps({ files: { '/m': 'fix: y\r\nbody\r\n' } });
    // Act
    const result = readSubject('/m', deps);
    // Assert
    assert.equal(result, 'fix: y');
  });

  test('returns an empty string when every line is a comment or blank', () => {
    // Arrange
    const { deps } = makeDeps({ files: { '/m': '# a\n\n# b\n' } });
    // Act
    const result = readSubject('/m', deps);
    // Assert
    assert.equal(result, '');
  });

  test('throws when the file cannot be read', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const act = () => readSubject('/missing', deps);
    // Assert
    assert.throws(act, /ENOENT/);
  });
});

describe('packageManager', () => {
  test('returns the flag when given', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = packageManager('yarn', deps);
    // Assert
    assert.equal(result, 'yarn');
  });

  test('returns the packageManager field name', () => {
    // Arrange
    const { deps } = makeDeps({ files: { [`${PKG}/package.json`]: '{"packageManager":"pnpm@9.0.0"}' } });
    // Act
    const result = packageManager(undefined, deps);
    // Assert
    assert.equal(result, 'pnpm');
  });

  test('falls back to lockfiles when package.json is invalid JSON', () => {
    // Arrange
    const { deps } = makeDeps({ files: { [`${PKG}/package.json`]: '{', [`${PKG}/yarn.lock`]: '' } });
    // Act
    const result = packageManager(undefined, deps);
    // Assert
    assert.equal(result, 'yarn');
  });

  test('rethrows an unexpected read error', () => {
    // Arrange
    const { deps } = makeDeps();
    deps.readFile = () => {
      throw Object.assign(new Error('boom'), { code: 'EIO' });
    };
    // Act
    const act = () => packageManager(undefined, deps);
    // Assert
    assert.throws(act, /boom/);
  });

  test('falls back to a lockfile in the package dir', () => {
    // Arrange
    const { deps } = makeDeps({ files: { [`${PKG}/yarn.lock`]: '' } });
    // Act
    const result = packageManager(undefined, deps);
    // Assert
    assert.equal(result, 'yarn');
  });

  test('falls back to a lockfile in the git root', () => {
    // Arrange
    const { deps } = makeDeps({ root: '/root', files: { '/root/bun.lock': '' } });
    // Act
    const result = packageManager(undefined, deps);
    // Assert
    assert.equal(result, 'bun');
  });

  test('defaults to npm when nothing matches', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = packageManager(undefined, deps);
    // Assert
    assert.equal(result, 'npm');
  });

  test('ignores an unknown packageManager name and invalid package.json', () => {
    // Arrange
    const { deps } = makeDeps({ files: { [`${PKG}/package.json`]: '{"packageManager":"toString@1"}' } });
    // Act
    const result = packageManager(undefined, deps);
    // Assert
    assert.equal(result, 'npm');
  });
});

describe('runCommitlint', () => {
  test('runs npx commitlint with --edit and the package dir as cwd', () => {
    // Arrange
    const { deps, spawned } = makeDeps();
    // Act
    runCommitlint('/m', 'npm', deps);
    // Assert
    assert.deepEqual(spawned[0].args, ['--no', '--', 'commitlint', '--edit', '/m']);
    assert.equal(spawned[0].opts.cwd, PKG);
  });

  test('uses the manager command from the flag', () => {
    // Arrange
    const { deps, spawned } = makeDeps();
    // Act
    runCommitlint('/m', 'pnpm', deps);
    // Assert
    assert.equal(spawned[0].cmd, 'pnpm');
  });

  test('quotes the file and uses a shell on Windows', () => {
    // Arrange
    const { deps, spawned } = makeDeps({ isWindows: true });
    // Act
    runCommitlint('C:\\m', 'npm', deps);
    // Assert
    assert.equal(spawned[0].args.at(-1), '"C:\\m"');
    assert.equal(spawned[0].opts.shell, true);
  });

  test('does not use a shell on POSIX', () => {
    // Arrange
    const { deps, spawned } = makeDeps();
    // Act
    runCommitlint('/m', 'bun', deps);
    // Assert
    assert.equal(spawned[0].opts.shell, false);
  });
});

describe('headerLengthError', () => {
  test('returns empty for a header of exactly 72 characters', () => {
    // Arrange
    const subject = 'x'.repeat(72);
    // Act
    const result = headerLengthError(subject);
    // Assert
    assert.equal(result, '');
  });

  test('returns empty for a short header', () => {
    // Arrange
    const subject = 'feat: add x';
    // Act
    const result = headerLengthError(subject);
    // Assert
    assert.equal(result, '');
  });

  test('returns an error for 73 characters', () => {
    // Arrange
    const subject = 'x'.repeat(73);
    // Act
    const result = headerLengthError(subject);
    // Assert
    assert.equal(result, 'header is 73 characters; max is 72');
  });

  test('returns an error for a very long header', () => {
    // Arrange
    const subject = 'y'.repeat(200);
    // Act
    const result = headerLengthError(subject);
    // Assert
    assert.match(result, /200 characters/);
  });
});

describe('imperativeError', () => {
  test('returns empty for an imperative description', () => {
    // Arrange
    const subject = 'feat: add thing';
    // Act
    const result = imperativeError(subject);
    // Assert
    assert.equal(result, '');
  });

  test('returns empty for an -ing/-ed imperative exception such as bring', () => {
    // Arrange
    const subject = 'feat: bring back x';
    // Act
    const result = imperativeError(subject);
    // Assert
    assert.equal(result, '');
  });

  test('returns an error for a past-tense first word', () => {
    // Arrange
    const subject = 'feat: added thing';
    // Act
    const result = imperativeError(subject);
    // Assert
    assert.match(result, /imperative/);
  });

  test('returns an error for a progressive first word', () => {
    // Arrange
    const subject = 'fix(core): fixing bug';
    // Act
    const result = imperativeError(subject);
    // Assert
    assert.match(result, /imperative/);
  });

  test('returns empty when the subject has no type separator', () => {
    // Arrange
    const subject = 'added thing';
    // Act
    const result = imperativeError(subject);
    // Assert
    assert.equal(result, '');
  });
});

describe('checkMessage', () => {
  test('returns no errors when commitlint passes and the subject is imperative', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = checkMessage('/m', 'feat: add x', 'npm', deps);
    // Assert
    assert.deepEqual(result, []);
  });

  test('returns the imperative error alone when commitlint passes', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = checkMessage('/m', 'feat: added x', 'npm', deps);
    // Assert
    assert.equal(result.length, 1);
    assert.match(result[0], /imperative/);
  });

  test('returns the commitlint output when it fails', () => {
    // Arrange
    const { deps } = makeDeps({ lint: { status: 1, stdout: 'out ', stderr: 'err' } });
    // Act
    const result = checkMessage('/m', 'feat: add x', 'npm', deps);
    // Assert
    assert.deepEqual(result, ['out err']);
  });

  test('falls back to the spawn error, then a default text, when commitlint prints nothing', () => {
    // Arrange
    const withError = makeDeps({ lint: { status: null, error: new Error('boom') } }).deps;
    const bare = makeDeps({ lint: { status: 1 } }).deps;
    // Act
    const a = checkMessage('/m', 'feat: add x', 'npm', withError);
    const b = checkMessage('/m', 'feat: add x', 'npm', bare);
    // Assert
    assert.deepEqual([a[0], b[0]], ['boom', 'commitlint failed']);
  });
});

describe('expandHome', () => {
  test('expands a leading tilde', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = expandHome('~/.ssh/key', deps);
    // Assert
    assert.equal(result, '/home/u/.ssh/key');
  });

  test('expands a bare tilde', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = expandHome('~', deps);
    // Assert
    assert.equal(result, '/home/u');
  });

  test('leaves an absolute path unchanged', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = expandHome('/etc/key', deps);
    // Assert
    assert.equal(result, '/etc/key');
  });

  test('leaves a tilde in the middle unchanged', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = expandHome('/a/~b', deps);
    // Assert
    assert.equal(result, '/a/~b');
  });
});

describe('publicKey', () => {
  test('returns type and base64 from a literal key', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const result = publicKey('key::ssh-ed25519 AAAA comment', deps);
    // Assert
    assert.equal(result, 'ssh-ed25519 AAAA');
  });

  test('reads the sibling .pub of a private key path', () => {
    // Arrange
    const { deps } = makeDeps({ files: { '/k': 'private', '/k.pub': 'ssh-rsa BBBB me\n' } });
    // Act
    const result = publicKey('/k', deps);
    // Assert
    assert.equal(result, 'ssh-rsa BBBB');
  });

  test('reads the path itself when no .pub exists', () => {
    // Arrange
    const { deps } = makeDeps({ files: { '/k': 'ssh-rsa CCCC me' } });
    // Act
    const result = publicKey('/k', deps);
    // Assert
    assert.equal(result, 'ssh-rsa CCCC');
  });

  test('throws when the key file is missing', () => {
    // Arrange
    const { deps } = makeDeps();
    // Act
    const act = () => publicKey('/none', deps);
    // Assert
    assert.throws(act, /ENOENT/);
  });
});

describe('signingError', () => {
  test('returns empty for a complete ssh setup', () => {
    // Arrange
    const { deps } = makeDeps({ config: goodSigning, files: { '/allowed': `me ${PUB} x\n` } });
    // Act
    const result = signingError(deps);
    // Assert
    assert.equal(result, '');
  });

  test('returns empty for a non-ssh format with a key set', () => {
    // Arrange
    const { deps } = makeDeps({ config: { 'commit.gpgsign': 'true', 'user.signingkey': 'ABC' } });
    // Act
    const result = signingError(deps);
    // Assert
    assert.equal(result, '');
  });

  test('reports commit.gpgsign not true', () => {
    // Arrange
    const { deps } = makeDeps({ config: { ...goodSigning, 'commit.gpgsign': 'false' } });
    // Act
    const result = signingError(deps);
    // Assert
    assert.equal(result, 'commit.gpgsign is not true');
  });

  test('reports a missing signing key', () => {
    // Arrange
    const { deps } = makeDeps({ config: { 'commit.gpgsign': 'true' } });
    // Act
    const result = signingError(deps);
    // Assert
    assert.equal(result, 'user.signingkey is not set');
  });

  test('reports a missing allowed signers setting and file', () => {
    // Arrange
    const noSetting = makeDeps({ config: { ...goodSigning, 'gpg.ssh.allowedSignersFile': '' } }).deps;
    const noFile = makeDeps({ config: goodSigning }).deps;
    // Act
    const a = signingError(noSetting);
    const b = signingError(noFile);
    // Assert
    assert.deepEqual([a, b], ['gpg.ssh.allowedSignersFile is not set', 'allowed signers file not found: /allowed']);
  });

  test('reports an unreadable key and a key absent from the signers file', () => {
    // Arrange
    const unreadable = makeDeps({
      config: { ...goodSigning, 'user.signingkey': '/nokey' },
      files: { '/allowed': 'x' }
    }).deps;
    const absent = makeDeps({ config: goodSigning, files: { '/allowed': 'other key' } }).deps;
    // Act
    const a = signingError(unreadable);
    const b = signingError(absent);
    // Assert
    assert.match(a, /^cannot read signing key: /);
    assert.equal(b, 'signing key is not in the allowed signers file');
  });
});

describe('report', () => {
  test('prints a passing status line', () => {
    // Arrange
    const { deps, logged } = makeDeps();
    // Act
    report(true, 'Label', 'subj', [], deps);
    // Assert
    assert.deepEqual(logged, ['✅ Label: "subj"']);
  });

  test('prints no detail lines when there are none', () => {
    // Arrange
    const { deps, logged } = makeDeps();
    // Act
    report(true, 'L', 's', [], deps);
    // Assert
    assert.equal(logged.length, 1);
  });

  test('prints a failing status line followed by indented details', () => {
    // Arrange
    const { deps, logged } = makeDeps();
    // Act
    report(false, 'Label', 'subj', ['a\nb'], deps);
    // Assert
    assert.deepEqual(logged, ['❌ Label: "subj"', '   a\n   b']);
  });

  test('prints every detail on its own line', () => {
    // Arrange
    const { deps, logged } = makeDeps();
    // Act
    report(false, 'L', 's', ['one', 'two'], deps);
    // Assert
    assert.deepEqual(logged.slice(1), ['   one', '   two']);
  });
});

describe('parseArgs', () => {
  test('returns the resolved file and no flags for a bare path', () => {
    // Arrange
    const argv = ['msg.txt'];
    // Act
    const result = parseArgs(argv);
    // Assert
    assert.equal(result.file, resolve('msg.txt'));
    assert.equal(result.flags.size, 0);
  });

  test('collects the skip flags and the --pm value', () => {
    // Arrange
    const argv = ['--skip-message', '--skip-signing', '--pm=pnpm', 'm'];
    // Act
    const result = parseArgs(argv);
    // Assert
    assert.deepEqual([...result.flags], ['--skip-message', '--skip-signing']);
    assert.equal(result.pmFlag, 'pnpm');
  });

  test('returns null without a file argument', () => {
    // Arrange
    const argv = ['--skip-signing'];
    // Act
    const result = parseArgs(argv);
    // Assert
    assert.equal(result, null);
  });

  test('returns null for an unknown flag', () => {
    // Arrange
    const argv = ['--nope', 'm'];
    // Act
    const result = parseArgs(argv);
    // Assert
    assert.equal(result, null);
  });

  test('returns null for an unsupported package manager', () => {
    // Arrange
    const argv = ['--pm=pip', 'm'];
    // Act
    const result = parseArgs(argv);
    // Assert
    assert.equal(result, null);
  });
});

describe('main', () => {
  const msg = resolve('m');

  test('returns 0 and prints three passing lines for a valid message and signing setup', () => {
    // Arrange
    const { deps, logged } = makeDeps({ config: goodSigning, files: { [msg]: 'feat: add x\n', '/allowed': PUB } });
    // Act
    const code = main(['m'], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(logged.length, 3);
    assert.ok(logged.every((line) => line.startsWith('✅')));
  });

  test('skips the message and signing checks when both flags are given', () => {
    // Arrange
    const { deps, logged } = makeDeps({ files: { [msg]: 'feat: add x\n' } });
    // Act
    const code = main(['--skip-message', '--skip-signing', 'm'], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(logged, []);
  });

  test('returns 1 when the subject is not imperative', () => {
    // Arrange
    const { deps } = makeDeps({ files: { [msg]: 'feat: added x\n' } });
    // Act
    const code = main(['--skip-signing', 'm'], deps);
    // Assert
    assert.equal(code, 1);
  });

  test('returns 1 when signing is not configured', () => {
    // Arrange
    const { deps, logged } = makeDeps({ files: { [msg]: 'feat: add x\n' } });
    // Act
    const code = main(['m'], deps);
    // Assert
    assert.equal(code, 1);
    assert.match(logged.at(-1), /commit.gpgsign is not true/);
  });

  test('returns 1 and prints usage for invalid arguments', () => {
    // Arrange
    const { deps, errors } = makeDeps();
    // Act
    const code = main([], deps);
    // Assert
    assert.equal(code, 1);
    assert.match(errors[0], /^usage: /);
  });

  test('returns 1 when the header is over 72 characters', () => {
    // Arrange
    const { deps } = makeDeps({ files: { [msg]: `feat: add ${'x'.repeat(70)}\n` } });
    // Act
    const code = main(['--skip-signing', 'm'], deps);
    // Assert
    assert.equal(code, 1);
  });
});
