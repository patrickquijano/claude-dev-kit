// Validates the commit message (commitlint, 72-char header, imperative heuristic) and pre-checks signing config.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Real side effects; tests pass stubs. `packageDir` is the parent of .husky/, so commitlint finds its config when the
// package is not at the git root.
const defaults = {
  spawn: spawnSync,
  readFile: readFileSync,
  exists: existsSync,
  home: homedir,
  isWindows: process.platform === 'win32',
  packageDir: fileURLToPath(new URL('..', import.meta.url)),
  log: (line) => console.log(line),
  error: (line) => console.error(line)
};

// Commitlint command per package manager, from the commitlint local setup guide.
const COMMITLINT = {
  npm: ['npx', ['--no', '--', 'commitlint']],
  pnpm: ['pnpm', ['commitlint']],
  yarn: ['yarn', ['commitlint']],
  bun: ['bun', ['commitlint']]
};
const LOCKFILES = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['package-lock.json', 'npm']
];

// Imperative verbs that end in -ed/-ing, so the past-tense heuristic skips them.
const IMPERATIVE_EXCEPTIONS = new Set([
  'bleed',
  'breed',
  'bring',
  'cling',
  'embed',
  'exceed',
  'feed',
  'fling',
  'heed',
  'need',
  'ping',
  'proceed',
  'ring',
  'seed',
  'shed',
  'shred',
  'sing',
  'sling',
  'speed',
  'spring',
  'sting',
  'string',
  'succeed',
  'swing',
  'wed',
  'weed',
  'wring'
]);

// Returns a git config value, or "" when unset.
export function gitConfig(key, deps = defaults) {
  const result = deps.spawn('git', ['config', '--get', key], { encoding: 'utf8', timeout: 15_000 });
  return result.status === 0 ? result.stdout.trim() : '';
}

// Uses core.commentChar when it is a single character; otherwise git's default "#".
export function commentChar(deps = defaults) {
  const value = gitConfig('core.commentChar', deps);
  return value.length === 1 ? value : '#';
}

// Returns the first non-empty, non-comment line of the message.
export function readSubject(file, deps = defaults) {
  const prefix = commentChar(deps);
  const lines = deps.readFile(file, 'utf8').split(/\r?\n/);
  return lines.find((line) => !line.startsWith(prefix) && line.trim() !== '')?.trim() ?? '';
}

// Returns the `pmFlag`, else the `packageManager` name, else the first lockfile match in the package dir or git root; npm by default.
export function packageManager(pmFlag, deps = defaults) {
  if (pmFlag) return pmFlag;
  try {
    const name = JSON.parse(deps.readFile(join(deps.packageDir, 'package.json'), 'utf8')).packageManager?.split('@')[0];
    if (Object.hasOwn(COMMITLINT, name)) return name;
  } catch (error) {
    // Missing or invalid package.json falls through to lockfiles.
    if (error?.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
  }
  const root = deps
    .spawn('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', timeout: 15_000 })
    .stdout?.trim();
  for (const dir of [deps.packageDir, root].filter(Boolean)) {
    const match = LOCKFILES.find(([lockfile]) => deps.exists(join(dir, lockfile)));
    if (match) return match[1];
  }
  return 'npm';
}

// Runs commitlint with the package manager's command from the commitlint docs.
export function runCommitlint(file, pmFlag, deps = defaults) {
  const [cmd, args] = COMMITLINT[packageManager(pmFlag, deps)];
  const arg = deps.isWindows ? `"${file}"` : file;
  return deps.spawn(cmd, [...args, '--edit', arg], {
    encoding: 'utf8',
    shell: deps.isWindows,
    cwd: deps.packageDir,
    timeout: 120_000
  });
}

export const MAX_HEADER = 72;

// Returns an error when the header is longer than MAX_HEADER UTF-16 units (commitlint's count), whatever its config says.
export function headerLengthError(subject) {
  const length = subject.length;
  return length > MAX_HEADER ? `header is ${length} characters; max is ${MAX_HEADER}` : '';
}

// Returns an error when the description's first word looks past tense or progressive.
export function imperativeError(subject) {
  const index = subject.indexOf(': ');
  if (index === -1) return '';
  const word = subject
    .slice(index + 2)
    .trim()
    .split(/\s+/)[0]
    .toLowerCase();
  return /(ed|ing)$/.test(word) && !IMPERATIVE_EXCEPTIONS.has(word)
    ? 'subject must be imperative ("add", not "added")'
    : '';
}

// Returns the list of problems found in the commit message.
export function checkMessage(file, subject, pmFlag, deps = defaults) {
  const errors = [];
  const lint = runCommitlint(file, pmFlag, deps);
  if (lint.status !== 0) {
    errors.push(((lint.stdout ?? '') + (lint.stderr ?? '')).trim() || lint.error?.message || 'commitlint failed');
  }
  const imperative = imperativeError(subject);
  if (imperative) errors.push(imperative);
  return errors;
}

// Expands a leading "~" to the home directory.
export function expandHome(path, deps = defaults) {
  return path.startsWith('~') ? deps.home() + path.slice(1) : path;
}

// Returns "<type> <base64>" from a literal key or a key file path (private paths use the sibling .pub).
export function publicKey(signingKey, deps = defaults) {
  const literal = signingKey.replace(/^key::/, '');
  const keyPath = expandHome(literal, deps);
  const pubPath = keyPath.endsWith('.pub') ? keyPath : `${keyPath}.pub`;
  const text = /^(ssh-|ecdsa-|sk-)/.test(literal)
    ? literal
    : deps.readFile(deps.exists(pubPath) ? pubPath : keyPath, 'utf8');
  return text.trim().split(/\s+/).slice(0, 2).join(' ');
}

// Returns the reason signing would fail, or "" when it is configured.
export function signingError(deps = defaults) {
  if (gitConfig('commit.gpgsign', deps) !== 'true') return 'commit.gpgsign is not true';
  const signingKey = gitConfig('user.signingkey', deps);
  if (!signingKey) return 'user.signingkey is not set';
  if (gitConfig('gpg.format', deps) !== 'ssh') return '';

  const allowed = gitConfig('gpg.ssh.allowedSignersFile', deps);
  if (!allowed) return 'gpg.ssh.allowedSignersFile is not set';
  const allowedPath = expandHome(allowed, deps);
  if (!deps.exists(allowedPath)) return `allowed signers file not found: ${allowedPath}`;

  let key;
  try {
    key = publicKey(signingKey, deps);
  } catch (error) {
    return `cannot read signing key: ${error.message}`;
  }
  return deps.readFile(allowedPath, 'utf8').includes(key) ? '' : 'signing key is not in the allowed signers file';
}

// Prints a status line followed by indented details.
export function report(ok, label, subject, details, deps = defaults) {
  deps.log(`${ok ? '✅' : '❌'} ${label}: "${subject}"`);
  for (const detail of details) {
    deps.log(detail.replace(/^/gm, '   '));
  }
}

// The stub may pass --skip-message, --skip-signing, or --pm=<name> to apply the choices made at setup.
// Returns { flags, pmFlag, file } or null when the arguments are invalid.
export function parseArgs(argv) {
  const flags = new Set(argv.filter((arg) => arg.startsWith('--') && !arg.startsWith('--pm=')));
  const pmFlag = argv.find((arg) => arg.startsWith('--pm='))?.slice(5);
  const fileArg = argv.find((arg) => !arg.startsWith('--'));
  const file = fileArg && resolve(fileArg);
  const unknownFlag = [...flags].some((flag) => flag !== '--skip-message' && flag !== '--skip-signing');
  if (!file || unknownFlag || (pmFlag !== undefined && !Object.hasOwn(COMMITLINT, pmFlag))) return null;
  return { flags, pmFlag, file };
}

// Runs the checks for `argv` (without node and script); returns the exit code.
export function main(argv, deps = defaults) {
  const parsed = parseArgs(argv);
  if (!parsed) {
    deps.error(
      'usage: node .husky/commit-msg.mjs [--skip-message] [--skip-signing] [--pm=npm|pnpm|yarn|bun] <message-file>'
    );
    return 1;
  }
  const { flags, pmFlag, file } = parsed;
  const subject = readSubject(file, deps);
  const messageErrors = flags.has('--skip-message') ? [] : checkMessage(file, subject, pmFlag, deps);
  if (!flags.has('--skip-message')) report(messageErrors.length === 0, 'Commit Message', subject, messageErrors, deps);

  const lengthError = flags.has('--skip-message') ? '' : headerLengthError(subject);
  if (!flags.has('--skip-message'))
    report(!lengthError, 'Header Length', subject, lengthError ? [lengthError] : [], deps);

  const signError = flags.has('--skip-signing') ? '' : signingError(deps);
  if (!flags.has('--skip-signing')) report(!signError, 'Signed', subject, signError ? [signError] : [], deps);

  return messageErrors.length || lengthError || signError ? 1 : 0;
}

// The one error boundary: an unexpected error prints one stderr line and rejects the commit (exit 1).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(
      `cdk commit-msg: ${String(error?.message ?? error)
        .split('\n')[0]
        .slice(0, 300)}`
    );
    process.exitCode = 1;
  }
}
