// Validates the commit message (commitlint + imperative heuristic) and pre-checks signing config.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const isWindows = process.platform === 'win32';
// Package dir (parent of .husky/), so commitlint finds its config when the package is not at the git root.
const packageDir = fileURLToPath(new URL('..', import.meta.url));

// Imperative verbs that end in -ed/-ing.
const IMPERATIVE_EXCEPTIONS = new Set([
  'bring',
  'embed',
  'exceed',
  'feed',
  'need',
  'proceed',
  'seed',
  'shed',
  'speed',
  'string',
  'succeed'
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

// Runs the local commitlint binary with node; falls back to `npx --no` if it cannot be resolved.
function runCommitlint(file) {
  try {
    const cli = createRequire(import.meta.url).resolve('@commitlint/cli/cli.js');
    return spawnSync(process.execPath, [cli, '--edit', file], { encoding: 'utf8', cwd: packageDir });
  } catch {
    const arg = isWindows ? `"${file}"` : file;
    return spawnSync('npx', ['--no', 'commitlint', '--edit', arg], {
      encoding: 'utf8',
      shell: isWindows,
      cwd: packageDir
    });
  }
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

const file = process.argv[2] && resolve(process.argv[2]);
if (!file) {
  console.error('usage: node .husky/commit-msg.mjs <message-file>');
  process.exit(1);
}

const subject = readSubject(file);
const messageErrors = checkMessage(file, subject);
report(messageErrors.length === 0, 'Commit Message', subject, messageErrors);

const signError = signingError();
report(!signError, 'Signed', subject, signError ? [signError] : []);

process.exit(messageErrors.length || signError ? 1 : 0);
