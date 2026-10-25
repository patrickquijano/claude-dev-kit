// Checks that git commit signing is configured: a key, the SSH allowed signers file with that key, and gpgsign when `.husky/` exists.
// CLI: `--root <dir>` (default the current directory), JSON on stdout, exit 0 = ok and 1 = a check failed. Reads git config and files only.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Runs `fn` only when this module is the entry script; an error it throws prints one stderr line and sets exit code 1.
async function runIfMain(metaUrl, fn, label) {
  if (!process.argv[1] || metaUrl !== pathToFileURL(realpathSync(process.argv[1])).href) return;
  try {
    const code = await fn();
    if (typeof code === 'number') process.exitCode = code;
  } catch (err) {
    process.stderr.write(
      `${label}: ${String(err?.message ?? err)
        .split('\n')[0]
        .slice(0, 300)}\n`
    );
    process.exitCode = 1;
  }
}

const SSH_KEY = /^(ssh-|ecdsa-|sk-)/;
const fail = (code, message, fix) => ({ code, message, fix });
const firstTwo = (text) => text.trim().split(/\s+/).slice(0, 2).join(' ');
const expand = (p, home) => (p === '~' || p.startsWith('~/') ? path.join(home, p.slice(1)) : p);

// The public key to look for in the signers file: the key itself for an inline key, else the first two fields of its `.pub` file; null when unreadable.
export function signingPublicKey(key, { readFile, home }) {
  const k = key.replace(/^key::/, '');
  if (SSH_KEY.test(k)) return firstTwo(k);
  const pub = expand(k.endsWith('.pub') ? k : `${k}.pub`, home);
  const text = readFile(pub);
  return text === null ? null : firstTwo(text);
}

// Inputs are the `git config --get` values (empty = unset); `husky` is true when `.husky/` exists; `readFile` returns the text or null when the file is missing.
export function checkSigning({ key = '', format = '', signersFile = '', gpgsign = '', husky = false }, deps) {
  const errors = [];
  if (!key) errors.push(fail('no-signing-key', 'user.signingkey is not set', 'set user.signingkey'));
  else if (format === 'ssh') {
    const file = expand(signersFile, deps.home);
    const signers = signersFile ? deps.readFile(file) : null;
    if (!signersFile)
      errors.push(fail('no-signers-file', 'gpg.ssh.allowedSignersFile is not set', 'set gpg.ssh.allowedSignersFile'));
    else if (signers === null)
      errors.push(fail('signers-file-missing', `${signersFile} does not exist`, 'create the allowed signers file'));
    else {
      const pub = signingPublicKey(key, deps);
      if (!pub || !signers.includes(pub))
        errors.push(
          fail('key-not-in-signers', `the signing public key is not in ${signersFile}`, 'add the key to the file')
        );
    }
  }
  if (husky && gpgsign !== 'true')
    errors.push(fail('gpgsign-off', '.husky/ exists but commit.gpgsign is not true', 'set commit.gpgsign to true'));
  return { ok: errors.length === 0, errors };
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
}

// Real side effects; tests pass stubs. `git` returns the trimmed value, '' when the key is unset (exit 1), and throws on any other failure.
const realDeps = {
  git(root, key) {
    const r = spawnSync('git', ['-C', root, 'config', '--get', key], { encoding: 'utf8', timeout: 10000 });
    if (r.error || (r.status !== 0 && r.status !== 1)) throw new Error(`git config --get ${key} failed`);
    return r.status === 0 ? r.stdout.trim() : '';
  },
  readFile(file) {
    try {
      return readFileSync(file, 'utf8');
    } catch (err) {
      if (err?.code === 'ENOENT') return null;
      throw err;
    }
  },
  exists: existsSync,
  home: homedir(),
  log: (text) => console.log(text)
};

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  const root = path.resolve(arg(argv, '--root') ?? '.');
  const res = checkSigning(
    {
      key: d.git(root, 'user.signingkey'),
      format: d.git(root, 'gpg.format'),
      signersFile: d.git(root, 'gpg.ssh.allowedSignersFile'),
      gpgsign: d.git(root, 'commit.gpgsign'),
      husky: d.exists(path.join(root, '.husky'))
    },
    d
  );
  d.log(JSON.stringify(res));
  return res.ok ? 0 : 1;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'check-signing');
