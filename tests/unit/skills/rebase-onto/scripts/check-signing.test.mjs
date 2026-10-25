import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import { checkSigning, main, signingPublicKey } from '../../../../../skills/rebase-onto/scripts/check-signing.mjs';

const PUB = 'ssh-ed25519 AAAAC3Nza';
const home = path.resolve('/stub-home');
const files = (map) => ({ home, readFile: (f) => map[f] ?? null });
const codes = (r) => r.errors.map((e) => e.code);

describe('signingPublicKey', () => {
  test('returns an inline key without the comment', () => {
    // Arrange
    const key = `key::${PUB} me@host`;
    // Act
    const result = signingPublicKey(key, files({}));
    // Assert
    assert.equal(result, PUB);
  });

  test('reads the first two fields of the .pub file for a key path', () => {
    // Arrange
    const deps = files({ [path.join(home, '.ssh/id.pub')]: `${PUB} me@host\n` });
    // Act
    const result = signingPublicKey('~/.ssh/id', deps);
    // Assert
    assert.equal(result, PUB);
  });

  test('returns null when the .pub file is missing', () => {
    // Arrange
    const deps = files({});
    // Act
    const result = signingPublicKey('/keys/id', deps);
    // Assert
    assert.equal(result, null);
  });

  test('does not treat a plain path as an inline key', () => {
    // Arrange
    const deps = files({ '/keys/ssh-key.pub': 'other' });
    // Act
    const result = signingPublicKey('/keys/ssh-key', deps);
    // Assert
    assert.equal(result, 'other');
  });
});

describe('checkSigning', () => {
  test('passes a gpg key with no husky', () => {
    // Arrange
    const input = { key: 'ABCDEF', format: '' };
    // Act
    const result = checkSigning(input, files({}));
    // Assert
    assert.equal(result.ok, true);
  });

  test('passes an ssh key found in the signers file with gpgsign on under husky', () => {
    // Arrange
    const input = { key: PUB, format: 'ssh', signersFile: '/s', gpgsign: 'true', husky: true };
    // Act
    const result = checkSigning(input, files({ '/s': `me ${PUB}\n` }));
    // Assert
    assert.equal(result.ok, true);
  });

  test('fails without a signing key', () => {
    // Arrange
    const input = { key: '' };
    // Act
    const result = checkSigning(input, files({}));
    // Assert
    assert.deepEqual(codes(result), ['no-signing-key']);
  });

  test('fails an ssh key missing from the signers file', () => {
    // Arrange
    const input = { key: PUB, format: 'ssh', signersFile: '/s' };
    // Act
    const result = checkSigning(input, files({ '/s': 'me ssh-ed25519 OTHER' }));
    // Assert
    assert.deepEqual(codes(result), ['key-not-in-signers']);
  });

  test('fails an ssh key with no signers file configured or on disk', () => {
    // Arrange
    const unset = { key: PUB, format: 'ssh' };
    const missing = { key: PUB, format: 'ssh', signersFile: '/gone' };
    // Act
    const results = [checkSigning(unset, files({})), checkSigning(missing, files({}))];
    // Assert
    assert.deepEqual(results.map(codes), [['no-signers-file'], ['signers-file-missing']]);
  });

  test('fails when husky exists and gpgsign is off', () => {
    // Arrange
    const input = { key: 'ABCDEF', gpgsign: 'false', husky: true };
    // Act
    const result = checkSigning(input, files({}));
    // Assert
    assert.deepEqual(codes(result), ['gpgsign-off']);
  });
});

describe('main', () => {
  const run = (config, extra = {}) => {
    const out = [];
    const code = main(['--root', '/repo'], {
      git: (_root, key) => config[key] ?? '',
      exists: () => false,
      log: (t) => out.push(t),
      ...files({}),
      ...extra
    });
    return { code, out: JSON.parse(out[0]) };
  };

  test('exits 0 and prints ok for a configured key', () => {
    // Arrange
    const config = { 'user.signingkey': 'ABCDEF' };
    // Act
    const { code, out } = run(config);
    // Assert
    assert.deepEqual([code, out.ok], [0, true]);
  });

  test('checks .husky under the given root', () => {
    // Arrange
    const config = { 'user.signingkey': 'ABCDEF' };
    const seen = [];
    // Act
    const { code } = run(config, {
      exists: (p) => {
        seen.push(p);
        return true;
      }
    });
    // Assert
    assert.deepEqual([code, seen], [1, [path.join(path.resolve('/repo'), '.husky')]]);
  });

  test('exits 1 and lists the error when no key is set', () => {
    // Arrange
    const config = {};
    // Act
    const { code, out } = run(config);
    // Assert
    assert.deepEqual([code, out.errors[0].code], [1, 'no-signing-key']);
  });

  test('exits 1 when husky exists and gpgsign is unset', () => {
    // Arrange
    const config = { 'user.signingkey': 'ABCDEF' };
    // Act
    const { code, out } = run(config, { exists: () => true });
    // Assert
    assert.deepEqual([code, out.errors[0].code], [1, 'gpgsign-off']);
  });
});
