// Validates the commit message (commitlint, 72-char header, imperative heuristic) and pre-checks signing config.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const isWindows = process.platform === 'win32';
// Package dir (parent of .husky/), so commitlint finds its config when the package is not at the git root.
const packageDir = fileURLToPath(new URL('..', import.meta.url));

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
function gitConfig(key) {
  const result = spawnSync('git', ['config', '--get', key], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

// Uses core.commentChar when it is a single character; otherwise git's default "#".
function commentChar() {
  const value = gitConfig('core.commentChar');
  return value.length === 1 ? value : '#';
}

// Returns the first non-empty, non-comment line of the message.
function readSubject(file) {
  const prefix = commentChar();
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  return lines.find((line) => !line.startsWith(prefix) && line.trim() !== '')?.trim() ?? '';
}

// Returns the `packageManager` name, else the first lockfile match in the package dir or git root; npm by default.
function packageManager() {
  if (pmFlag) return pmFlag;
  try {
    const name = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')).packageManager?.split('@')[0];
    if (COMMITLINT[name]) return name;
  } catch {
    // Missing or invalid package.json falls through to lockfiles.
  }
  const root = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).stdout?.trim();
  for (const dir of [packageDir, root].filter(Boolean)) {
    const match = LOCKFILES.find(([lockfile]) => existsSync(join(dir, lockfile)));
    if (match) return match[1];
  }
  return 'npm';
}

// Runs commitlint with the package manager's command from the commitlint docs.
function runCommitlint(file) {
  const [cmd, args] = COMMITLINT[packageManager()];
  const arg = isWindows ? `"${file}"` : file;
  return spawnSync(cmd, [...args, '--edit', arg], { encoding: 'utf8', shell: isWindows, cwd: packageDir });
}

const MAX_HEADER = 72;

// Returns an error when the header is longer than MAX_HEADER UTF-16 units (commitlint's count), whatever its config says.
function headerLengthError(subject) {
  const length = subject.length;
  return length > MAX_HEADER ? `header is ${length} characters; max is ${MAX_HEADER}` : '';
}

// Returns an error when the description's first word looks past tense or progressive.
function imperativeError(subject) {
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
function checkMessage(file, subject) {
  const errors = [];
  const lint = runCommitlint(file);
  if (lint.status !== 0) {
    errors.push((lint.stdout + lint.stderr).trim() || lint.error?.message || 'commitlint failed');
  }
  const imperative = imperativeError(subject);
  if (imperative) errors.push(imperative);
  return errors;
}

// Expands a leading "~" to the home directory.
function expandHome(path) {
  return path.startsWith('~') ? homedir() + path.slice(1) : path;
}

// Returns "<type> <base64>" from a literal key or a key file path (private paths use the sibling .pub).
function publicKey(signingKey) {
  const literal = signingKey.replace(/^key::/, '');
  const keyPath = expandHome(literal);
  const pubPath = keyPath.endsWith('.pub') ? keyPath : `${keyPath}.pub`;
  const text = /^(ssh-|ecdsa-|sk-)/.test(literal)
    ? literal
    : readFileSync(existsSync(pubPath) ? pubPath : keyPath, 'utf8');
  return text.trim().split(/\s+/).slice(0, 2).join(' ');
}

// Returns the reason signing would fail, or "" when it is configured.
function signingError() {
  if (gitConfig('commit.gpgsign') !== 'true') return 'commit.gpgsign is not true';
  const signingKey = gitConfig('user.signingkey');
  if (!signingKey) return 'user.signingkey is not set';
  if (gitConfig('gpg.format') !== 'ssh') return '';

  const allowed = gitConfig('gpg.ssh.allowedSignersFile');
  if (!allowed) return 'gpg.ssh.allowedSignersFile is not set';
  const allowedPath = expandHome(allowed);
  if (!existsSync(allowedPath)) return `allowed signers file not found: ${allowedPath}`;

  let key;
  try {
    key = publicKey(signingKey);
  } catch (error) {
    return `cannot read signing key: ${error.message}`;
  }
  return readFileSync(allowedPath, 'utf8').includes(key) ? '' : 'signing key is not in the allowed signers file';
}

// Prints a status line followed by indented details.
function report(ok, label, subject, details) {
  console.log(`${ok ? '✅' : '❌'} ${label}: "${subject}"`);
  for (const detail of details) {
    console.log(detail.replace(/^/gm, '   '));
  }
}

// The stub may pass --skip-message, --skip-signing, or --pm=<name> to apply the choices made at setup.
const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--') && !arg.startsWith('--pm=')));
const pmFlag = args.find((arg) => arg.startsWith('--pm='))?.slice(5);
const fileArg = args.find((arg) => !arg.startsWith('--'));
const file = fileArg && resolve(fileArg);
const unknownFlag = [...flags].some((flag) => flag !== '--skip-message' && flag !== '--skip-signing');
if (!file || unknownFlag || (pmFlag !== undefined && !COMMITLINT[pmFlag])) {
  console.error(
    'usage: node .husky/commit-msg.mjs [--skip-message] [--skip-signing] [--pm=npm|pnpm|yarn|bun] <message-file>'
  );
  process.exit(1);
}

const subject = readSubject(file);
const messageErrors = flags.has('--skip-message') ? [] : checkMessage(file, subject);
if (!flags.has('--skip-message')) report(messageErrors.length === 0, 'Commit Message', subject, messageErrors);

const lengthError = flags.has('--skip-message') ? '' : headerLengthError(subject);
if (!flags.has('--skip-message')) report(!lengthError, 'Header Length', subject, lengthError ? [lengthError] : []);

const signError = flags.has('--skip-signing') ? '' : signingError();
if (!flags.has('--skip-signing')) report(!signError, 'Signed', subject, signError ? [signError] : []);

process.exit(messageErrors.length || lengthError || signError ? 1 : 0);
