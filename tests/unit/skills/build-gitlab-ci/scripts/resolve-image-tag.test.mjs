import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  isAllowedRegistry,
  main,
  parseChallenge,
  parseImage,
  pickTag,
  tagLines
} from '../../../../../skills/build-gitlab-ci/scripts/resolve-image-tag.mjs';

const ENOENT = { error: { code: 'ENOENT' } };
const ok = (stdout) => ({ status: 0, stdout, stderr: '' });
const fail = { status: 1, stdout: '', stderr: '' };

// Stub deps; `table` maps a command to its result, an unlisted command is not installed.
const setup = ({ table = {}, fetch } = {}) => {
  const logs = [];
  const errors = [];
  const urls = [];
  const deps = {
    run: (cmd) => table[cmd] ?? ENOENT,
    fetch:
      fetch &&
      (async (url, init) => {
        urls.push(url);
        return fetch(url, init);
      }),
    log: (text) => logs.push(text),
    error: (text) => errors.push(text)
  };
  return { deps, logs, errors, urls };
};
const json = (body, headers = {}) => ({
  ok: true,
  status: 200,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  text: async () => JSON.stringify(body)
});
const challenged = {
  ok: false,
  status: 401,
  headers: {
    get: (name) =>
      name.toLowerCase() === 'www-authenticate'
        ? 'Bearer realm="https://ghcr.io/token",service="ghcr.io",scope="repository:org/app:pull"'
        : null
  }
};
const noNetwork = async () => {
  throw new TypeError('fetch failed');
};

describe('pickTag', () => {
  test('picks the highest by numeric order', () => {
    // Arrange
    const tags = ['1.2.3', '1.10.0', '1.9.9', 'latest'];
    // Act
    const tag = pickTag(tags, '');
    // Assert
    assert.equal(tag, '1.10.0');
  });

  test('keeps only the variant when one is given', () => {
    // Arrange
    const tags = ['2.0.0', '1.5.0-alpine', '1.4.0-alpine', '1.6.0-slim'];
    // Act
    const tag = pickTag(tags, 'alpine');
    // Assert
    assert.equal(tag, '1.5.0-alpine');
  });

  test('skips pre-releases', () => {
    // Arrange
    const tags = ['3.0.0-rc1', '3.0.0-beta', '3.0.0-nightly', '2.9.0'];
    // Act
    const tag = pickTag(tags, '');
    // Assert
    assert.equal(tag, '2.9.0');
  });

  test('returns null when nothing matches', () => {
    // Arrange
    const tags = ['latest', '1.2', '1.2.3-alpine'];
    // Act
    const tag = pickTag(tags, '');
    // Assert
    assert.equal(tag, null);
  });

  test('returns null for an empty list or a variant with no match', () => {
    // Arrange
    const tags = ['1.0.0'];
    // Act
    const results = [pickTag([], ''), pickTag(tags, 'slim')];
    // Assert
    assert.deepEqual(results, [null, null]);
  });
});

describe('parseImage', () => {
  test('puts an official image on Docker Hub under library/', () => {
    // Arrange
    const image = 'nginx';
    // Act
    const parsed = parseImage(image);
    // Assert
    assert.deepEqual(parsed, { registry: 'docker.io', repo: 'library/nginx' });
  });

  test('normalizes Docker Hub aliases and splits other hosts', () => {
    // Arrange
    const hub = 'docker.io/x/y';
    const ghcr = 'ghcr.io/org/app';
    // Act
    const results = [parseImage(hub), parseImage(ghcr)];
    // Assert
    assert.deepEqual(results, [
      { registry: 'docker.io', repo: 'x/y' },
      { registry: 'ghcr.io', repo: 'org/app' }
    ]);
  });

  test('keeps a dotless two-segment name on Docker Hub', () => {
    // Arrange
    const image = 'org/app';
    // Act
    const parsed = parseImage(image);
    // Assert
    assert.deepEqual(parsed, { registry: 'docker.io', repo: 'org/app' });
  });

  test('keeps an unknown host and its deep path', () => {
    // Arrange
    const image = 'example.com/a/b/c';
    // Act
    const parsed = parseImage(image);
    // Assert
    assert.deepEqual(parsed, { registry: 'example.com', repo: 'a/b/c' });
  });
});

describe('isAllowedRegistry', () => {
  test('accepts listed hosts', () => {
    // Arrange
    const hosts = ['ghcr.io', 'mcr.microsoft.com', 'registry.k8s.io'];
    // Act
    const results = hosts.map(isAllowedRegistry);
    // Assert
    assert.deepEqual(results, [true, true, true]);
  });

  test('accepts regional gcr.io and Artifact Registry hosts', () => {
    // Arrange
    const hosts = ['us-docker.pkg.dev', 'eu.gcr.io'];
    // Act
    const results = hosts.map(isAllowedRegistry);
    // Assert
    assert.deepEqual(results, [true, true]);
  });

  test('rejects unlisted hosts', () => {
    // Arrange
    const host = 'example.com';
    // Act
    const result = isAllowedRegistry(host);
    // Assert
    assert.equal(result, false);
  });

  test('rejects look-alike hosts', () => {
    // Arrange
    const hosts = ['evil.gcr.io.example.com', 'ghcr.io.evil.com', 'x.docker.pkg.dev'];
    // Act
    const results = hosts.map(isAllowedRegistry);
    // Assert
    assert.deepEqual(results, [false, false, false]);
  });
});

describe('parseChallenge', () => {
  test('parses a ghcr-style header', () => {
    // Arrange
    const header = 'Bearer realm="https://ghcr.io/token",service="ghcr.io",scope="repository:org/app:pull"';
    // Act
    const challenge = parseChallenge(header);
    // Assert
    assert.deepEqual(challenge, {
      realm: 'https://ghcr.io/token',
      service: 'ghcr.io',
      scope: 'repository:org/app:pull'
    });
  });

  test('parses a quay-style header without scope', () => {
    // Arrange
    const header = 'Bearer realm="https://quay.io/v2/auth",service="quay.io"';
    // Act
    const challenge = parseChallenge(header);
    // Assert
    assert.deepEqual(challenge, { realm: 'https://quay.io/v2/auth', service: 'quay.io', scope: undefined });
  });

  test('returns null for a non-Bearer scheme or a missing header', () => {
    // Arrange
    const basic = 'Basic realm="https://ghcr.io/token"';
    // Act
    const results = [parseChallenge(basic), parseChallenge(null)];
    // Assert
    assert.deepEqual(results, [null, null]);
  });

  test('returns null for a non-https or missing realm', () => {
    // Arrange
    const http = 'Bearer realm="http://ghcr.io/token",service="ghcr.io"';
    const none = 'Bearer service="ghcr.io"';
    // Act
    const results = [parseChallenge(http), parseChallenge(none)];
    // Assert
    assert.deepEqual(results, [null, null]);
  });
});

describe('tagLines', () => {
  test('reads registry JSON tags', () => {
    // Arrange
    const out = '{"name":"x","tags":["1.0.0","latest"]}';
    // Act
    const tags = tagLines('registry-api', out);
    // Assert
    assert.deepEqual(tags, ['1.0.0', 'latest']);
  });

  test('returns an empty list for invalid registry JSON or a missing key', () => {
    // Arrange
    const bad = 'not json';
    const missing = '{"other":1}';
    // Act
    const tags = [tagLines('registry-api', bad), tagLines('registry-api', missing)];
    // Assert
    assert.deepEqual(tags, [[], []]);
  });

  test('reads skopeo JSON Tags', () => {
    // Arrange
    const out = '{"Repository":"x","Tags":["1.0.0","latest"]}';
    // Act
    const tags = tagLines('skopeo', out);
    // Assert
    assert.deepEqual(tags, ['1.0.0', 'latest']);
  });

  test('splits line-based tools and Docker Hub results', () => {
    // Arrange
    const hub = '{"results":[{"name":"1.0.0"},{"name":"2.0.0"}]}';
    // Act
    const lines = tagLines('crane', '1.0.0\n\n 2.0.0 \n');
    const names = tagLines('docker-hub-api', hub);
    // Assert
    assert.deepEqual(lines, ['1.0.0', '2.0.0']);
    assert.deepEqual(names, ['1.0.0', '2.0.0']);
  });

  test('returns an empty list for invalid JSON', () => {
    // Arrange
    const out = 'not json';
    // Act
    const tags = [tagLines('skopeo', out), tagLines('docker-hub-api', out)];
    // Assert
    assert.deepEqual(tags, [[], []]);
  });

  test('returns an empty list when the expected key is missing', () => {
    // Arrange
    const out = '{"other":1}';
    // Act
    const tags = [tagLines('skopeo', out), tagLines('docker-hub-api', out)];
    // Assert
    assert.deepEqual(tags, [[], []]);
  });
});

describe('main', () => {
  test('resolves with crane and records the tools tried', async () => {
    // Arrange
    const s = setup({ table: { crane: ok('1.2.3\n1.10.0\nlatest\n') }, fetch: noNetwork });
    // Act
    const code = await main(['example/app'], s.deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(s.logs[0]), {
      image: 'example/app',
      tag: '1.10.0',
      method: 'crane',
      tried: ['crane']
    });
  });

  test('falls through a failing tool to the next', async () => {
    // Arrange
    const s = setup({ table: { crane: fail, regctl: ok('4.1.0\n4.0.0\n') }, fetch: noNetwork });
    // Act
    const code = await main(['example/app'], s.deps);
    // Assert
    const out = JSON.parse(s.logs[0]);
    assert.equal(code, 0);
    assert.equal(out.method, 'regctl');
    assert.deepEqual(out.tried, ['crane', 'regctl']);
  });

  test('falls back to Docker Hub with the library/ path for an official image', async () => {
    // Arrange
    const s = setup({
      fetch: async () => ({ ok: true, text: async () => '{"results":[{"name":"1.1.0"},{"name":"1.0.0"}]}' })
    });
    // Act
    const code = await main(['nginx', 'alpine'], s.deps);
    // Assert
    assert.equal(code, 2);
    assert.equal(s.urls[0], 'https://hub.docker.com/v2/repositories/library/nginx/tags?page_size=100&name=alpine');
  });

  test('resolves from Docker Hub when it has a stable tag', async () => {
    // Arrange
    const s = setup({
      fetch: async () => ({ ok: true, text: async () => '{"results":[{"name":"1.1.0"},{"name":"1.0.0"}]}' })
    });
    // Act
    const code = await main(['nginx'], s.deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(s.logs[0]), {
      image: 'nginx',
      tag: '1.1.0',
      method: 'docker-hub-api',
      tried: ['docker-hub-api']
    });
  });

  test('exits 2 with null tag when every tool fails', async () => {
    // Arrange
    const s = setup({ table: { crane: fail }, fetch: noNetwork });
    // Act
    const code = await main(['example/app'], s.deps);
    // Assert
    assert.equal(code, 2);
    assert.deepEqual(JSON.parse(s.logs[0]), {
      image: 'example/app',
      tag: null,
      method: null,
      tried: ['crane', 'docker-hub-api']
    });
  });

  test('queries Docker Hub as library/nginx for docker.io/library/nginx', async () => {
    // Arrange
    const s = setup({ fetch: async () => ({ ok: true, text: async () => '{"results":[{"name":"1.0.0"}]}' }) });
    // Act
    const code = await main(['docker.io/library/nginx'], s.deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(s.urls[0], 'https://hub.docker.com/v2/repositories/library/nginx/tags?page_size=100&name=.');
  });

  test('skips Docker Hub for a deep Docker Hub path', async () => {
    // Arrange
    const s = setup({ fetch: noNetwork });
    // Act
    const code = await main(['a/b/c'], s.deps);
    // Assert
    assert.equal(code, 2);
    assert.deepEqual(JSON.parse(s.logs[0]).tried, []);
  });

  test('resolves from ghcr.io through an anonymous bearer token', async () => {
    // Arrange
    const s = setup({
      fetch: async (url, init) => {
        if (String(url).startsWith('https://ghcr.io/token')) return json({ token: 't0k' });
        if (init?.headers?.Authorization === 'Bearer t0k') return json({ tags: ['1.0.0', '1.2.0', 'latest'] });
        return challenged;
      }
    });
    // Act
    const code = await main(['ghcr.io/org/app'], s.deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(s.logs[0]), {
      image: 'ghcr.io/org/app',
      tag: '1.2.0',
      method: 'registry-api',
      tried: ['registry-api']
    });
    assert.equal(s.urls[0], 'https://ghcr.io/v2/org/app/tags/list?n=1000');
    assert.equal(s.urls[1], 'https://ghcr.io/token?service=ghcr.io&scope=repository%3Aorg%2Fapp%3Apull');
  });

  test('resolves from mcr.microsoft.com without a token', async () => {
    // Arrange
    const s = setup({ fetch: async () => json({ tags: ['8.0.100', '9.0.100'] }) });
    // Act
    const code = await main(['mcr.microsoft.com/dotnet/sdk'], s.deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(s.logs[0]).tag, '9.0.100');
    assert.deepEqual(s.urls, ['https://mcr.microsoft.com/v2/dotnet/sdk/tags/list?n=1000']);
  });

  test('collects tags across Link pages', async () => {
    // Arrange
    const s = setup({
      fetch: async (url) =>
        String(url).includes('last=')
          ? json({ tags: ['3.0.0'] })
          : json({ tags: ['1.0.0'] }, { link: '</v2/org/app/tags/list?n=1000&last=1.0.0>; rel="next"' })
    });
    // Act
    const code = await main(['quay.io/org/app'], s.deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(s.logs[0]).tag, '3.0.0');
    assert.equal(s.urls.length, 2);
  });

  test('does not follow a Link to another host', async () => {
    // Arrange
    const s = setup({
      fetch: async () => json({ tags: ['1.0.0'] }, { link: '<https://evil.example/v2/x/tags/list>; rel="next"' })
    });
    // Act
    const code = await main(['quay.io/org/app'], s.deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(s.urls, ['https://quay.io/v2/org/app/tags/list?n=1000']);
  });

  test('exits 2 when the token endpoint fails', async () => {
    // Arrange
    const s = setup({
      fetch: async (url) => (String(url).startsWith('https://ghcr.io/token') ? { ok: false, status: 500 } : challenged)
    });
    // Act
    const code = await main(['ghcr.io/org/app'], s.deps);
    // Assert
    assert.equal(code, 2);
    assert.deepEqual(JSON.parse(s.logs[0]).tried, ['registry-api']);
  });

  test('makes no request for an unknown host', async () => {
    // Arrange
    const s = setup({ fetch: noNetwork });
    // Act
    const code = await main(['example.com/a/b'], s.deps);
    // Assert
    assert.equal(code, 2);
    assert.deepEqual(s.urls, []);
    assert.deepEqual(JSON.parse(s.logs[0]).tried, []);
  });

  test('rejects a bad image name with exit 1 and no stdout', async () => {
    // Arrange
    const s = setup({ table: { crane: ok('1.0.0') } });
    // Act
    const code = await main(['bad name; rm -rf /'], s.deps);
    // Assert
    assert.equal(code, 1);
    assert.deepEqual(s.logs, []);
  });

  test('rejects a bad variant and a wrong argument count', async () => {
    // Arrange
    const s = setup();
    // Act
    const codes = [await main(['a', 'Bad Variant'], s.deps), await main([], s.deps)];
    // Assert
    assert.deepEqual(codes, [1, 1]);
    assert.deepEqual(s.logs, []);
  });
});
