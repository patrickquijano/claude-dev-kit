import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { main, mergePipeline, parseRemote } from '../../../../../skills/build-gitlab-ci/scripts/lint-ci.mjs';

const ROOT = "stages:\n  - test\ninclude:\n  - local: '/.gitlab/ci/*.gitlab-ci.yml'\n";
const JOB = '---\nunit-test:\n  stage: test\n  script:\n    - true\n';
const ENOENT = { error: { code: 'ENOENT' } };
const ok = (stdout = '') => ({ status: 0, stdout, stderr: '' });
const fail = (stderr = '', stdout = '') => ({ status: 1, stdout, stderr });

// Stub deps over an in-memory repo; `table` maps a command to its result, an unlisted command is not installed.
const setup = ({ table = {}, env = {}, fetch, files } = {}) => {
  const written = {};
  const logs = [];
  const errors = [];
  const fs = files ?? { '/r/.gitlab-ci.yml': ROOT, '/r/.gitlab/ci/unit-test.gitlab-ci.yml': JOB };
  const deps = {
    run: (cmd, args) => {
      const entry = table[cmd];
      if (typeof entry === 'function') return entry(args);
      return entry ?? ENOENT;
    },
    fetch,
    exists: (p) => p in fs || Object.keys(fs).some((k) => k.startsWith(`${p}/`)),
    readFile: (p) => fs[p],
    readDir: (p) =>
      Object.keys(fs)
        .filter((k) => k.startsWith(`${p}/`))
        .map((k) => k.slice(p.length + 1)),
    writeFile: (p, text) => {
      written[p] = text;
    },
    makeTempDir: () => '/work',
    rm: () => {},
    env,
    log: (text) => logs.push(text),
    error: (text) => errors.push(text)
  };
  return { deps, written, logs, errors };
};

describe('mergePipeline', () => {
  test('drops the local include and the include header it leaves empty', () => {
    // Arrange
    const jobs = [JOB];
    // Act
    const merged = mergePipeline(ROOT, jobs);
    // Assert
    assert.doesNotMatch(merged, /local:/);
    assert.doesNotMatch(merged, /^include:/m);
    assert.match(merged, /unit-test:/);
  });

  test('strips --- lines from job files and appends them in the given order', () => {
    // Arrange
    const jobs = ['---\na:\n  script: [x]\n', '---\nb:\n  script: [y]\n'];
    // Act
    const merged = mergePipeline('stages: [test]\n', jobs);
    // Assert
    assert.doesNotMatch(merged, /^---$/m);
    assert.ok(merged.indexOf('a:') < merged.indexOf('b:'));
  });

  test('keeps an include header that still has a remote entry', () => {
    // Arrange
    const root = "include:\n  - local: '/.gitlab/ci/a.gitlab-ci.yml'\n  - remote: 'https://example.com/x.yml'\n";
    // Act
    const merged = mergePipeline(root, []);
    // Assert
    assert.equal(merged, "include:\n  - remote: 'https://example.com/x.yml'\n");
  });

  test('keeps a root without includes unchanged', () => {
    // Arrange
    const root = 'stages:\n  - test\n';
    // Act
    const merged = mergePipeline(root, []);
    // Assert
    assert.equal(merged, root);
  });
});

describe('parseRemote', () => {
  test('parses https and strips .git', () => {
    // Arrange
    const url = 'https://gitlab.com/group/sub/proj.git';
    // Act
    const res = parseRemote(url);
    // Assert
    assert.deepEqual(res, { host: 'gitlab.com', path: 'group/sub/proj' });
  });

  test('parses scp-style ssh', () => {
    // Arrange
    const url = 'git@gitlab.example.com:group/proj.git';
    // Act
    const res = parseRemote(url);
    // Assert
    assert.deepEqual(res, { host: 'gitlab.example.com', path: 'group/proj' });
  });

  test('parses ssh:// with user and port', () => {
    // Arrange
    const url = 'ssh://git@gitlab.example.com:2222/group/proj';
    // Act
    const res = parseRemote(url);
    // Assert
    assert.deepEqual(res, { host: 'gitlab.example.com', path: 'group/proj' });
  });

  test('rejects a path with an injected segment', () => {
    // Arrange
    const url = 'https://gitlab.com/group/../x?y=$(id)';
    // Act
    const res = parseRemote(url);
    // Assert
    assert.equal(res, null);
  });

  test('rejects a malformed or non-string remote', () => {
    // Arrange
    const inputs = ['', 'not a url', null];
    // Act
    const results = inputs.map(parseRemote);
    // Assert
    assert.deepEqual(results, [null, null, null]);
  });
});

describe('main', () => {
  test('merges job files, calls glab, and exits 0 when valid', async () => {
    // Arrange
    const s = setup({ table: { glab: ok('CI/CD YAML is valid\n') } });
    // Act
    const code = await main(['/r'], s.deps);
    // Assert
    assert.equal(code, 0);
    assert.match(s.logs[0], /^method=glab\nCI\/CD YAML is valid$/);
    const merged = s.written['/work/merged.gitlab-ci.yml'];
    assert.match(merged, /unit-test:/);
    assert.doesNotMatch(merged, /local:|^---$|^include:/m);
  });

  test('exits 1 and prints the raw message when glab reports invalid', async () => {
    // Arrange
    const s = setup({ table: { glab: fail('', 'jobs:unit-test config contains unknown keys: foo\n') } });
    // Act
    const code = await main(['/r'], s.deps);
    // Assert
    assert.equal(code, 1);
    assert.match(s.logs[0], /unknown keys: foo/);
  });

  test('falls back to yamllint when glab is not authenticated', async () => {
    // Arrange
    const s = setup({ table: { glab: fail('401 Unauthorized'), yamllint: ok() } });
    // Act
    const code = await main(['/r'], s.deps);
    // Assert
    assert.equal(code, 0);
    assert.match(s.logs[0], /^method=yamllint scope=syntax/);
  });

  test('exits 2 when no validator is available', async () => {
    // Arrange
    const s = setup({ table: { python3: fail() } });
    // Act
    const code = await main(['/r'], s.deps);
    // Assert
    assert.equal(code, 2);
    assert.equal(s.logs[0], 'method=none');
    assert.match(s.errors[0], /no validator/);
  });

  test('uses the API when GITLAB_TOKEN is set and exits 0 when valid, never printing the token', async () => {
    // Arrange
    const calls = [];
    const s = setup({
      table: { git: ok('git@gitlab.com:g/p.git\n') },
      env: { GITLAB_TOKEN: 'glpat-secret' },
      fetch: async (url, init) => {
        calls.push({ url, init });
        return { ok: true, text: async () => '{"valid":true,"errors":[]}' };
      }
    });
    // Act
    const code = await main(['/r'], s.deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(calls[0].url, 'https://gitlab.com/api/v4/projects/g%2Fp/ci/lint');
    assert.equal(calls[0].init.headers['PRIVATE-TOKEN'], 'glpat-secret');
    assert.match(s.logs[0], /^method=api\n/);
    assert.ok(![...s.logs, ...s.errors].some((t) => t.includes('glpat-secret')));
  });

  test('exits 1 when the API reports the pipeline invalid', async () => {
    // Arrange
    const s = setup({
      table: { git: ok('https://gitlab.com/g/p.git\n') },
      env: { GITLAB_TOKEN: 't' },
      fetch: async () => ({ ok: true, text: async () => '{"valid":false,"errors":["bad"]}' })
    });
    // Act
    const code = await main(['/r'], s.deps);
    // Assert
    assert.equal(code, 1);
    assert.match(s.logs[0], /"valid":false/);
  });

  test('falls through to yamllint when the API request fails', async () => {
    // Arrange
    const s = setup({
      table: { git: ok('https://gitlab.com/g/p.git\n'), yamllint: ok() },
      env: { GITLAB_TOKEN: 't' },
      fetch: async () => {
        throw new TypeError('fetch failed');
      }
    });
    // Act
    const code = await main(['/r'], s.deps);
    // Assert
    assert.equal(code, 0);
    assert.match(s.logs[0], /^method=yamllint/);
  });

  test('exits 1 when .gitlab-ci.yml is missing', async () => {
    // Arrange
    const s = setup({ files: {} });
    // Act
    const code = await main(['/nowhere'], s.deps);
    // Assert
    assert.equal(code, 1);
    assert.match(s.errors[0], /no \.gitlab-ci\.yml in \/nowhere/);
  });
});
