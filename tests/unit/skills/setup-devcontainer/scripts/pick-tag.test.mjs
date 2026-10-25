import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { main, pickHubTag, pickTag } from '../../../../../skills/setup-devcontainer/scripts/pick-tag.mjs';

const TAGS = [
  '1-3.12-bookworm',
  '2-3.12-bullseye',
  '2-3.12-bookworm',
  '2-3.13-bookworm',
  '2-3.12-noble',
  '2.1.0-3.12-bookworm',
  '2.1.5-3.12-bookworm',
  '2.1.10-3.12-trixie',
  '2.1.10-3.12-bookworm',
  'dev-3.12-bookworm',
  '2-3.12-bookworm-rc1'
];

const stubs = () => {
  const out = { logs: [], errors: [] };
  return { out, log: (t) => out.logs.push(t), error: (t) => out.errors.push(t) };
};
const okFetch =
  (tags, status = 200) =>
  async () => ({ ok: status === 200, status, json: async () => ({ tags }) });

describe('pickTag', () => {
  test('image mode takes the highest major and the newest codename', () => {
    // Arrange
    const input = { tags: TAGS, runtime: '3.12', mode: 'image' };
    // Act
    const result = pickTag(input);
    // Assert
    assert.deepEqual(result, { ok: true, tag: '2-3.12-bookworm' });
  });

  test('dockerfile mode compares X.Y.Z numerically, not as text', () => {
    // Arrange
    const input = { tags: TAGS, runtime: '3.12', mode: 'dockerfile' };
    // Act
    const result = pickTag(input);
    // Assert
    assert.deepEqual(result, { ok: true, tag: '2.1.10-3.12-trixie' });
  });

  test('no runtime matches the two-part form', () => {
    // Arrange
    const input = { tags: ['1-bullseye', '1-bookworm', '2-bookworm'], mode: 'image' };
    // Act
    const result = pickTag(input);
    // Assert
    assert.deepEqual(result, { ok: true, tag: '2-bookworm' });
  });

  test('no tag for the runtime is an error', () => {
    // Arrange
    const input = { tags: TAGS, runtime: '9.9', mode: 'image' };
    // Act
    const result = pickTag(input);
    // Assert
    assert.equal(result.ok, false);
  });

  test('a non-Debian or pre-release only list is an error', () => {
    // Arrange
    const input = {
      tags: ['2-3.12-noble', 'dev-3.12-bookworm', '2-3.12-bookworm-rc1'],
      runtime: '3.12',
      mode: 'image'
    };
    // Act
    const result = pickTag(input);
    // Assert
    assert.equal(result.ok, false);
  });

  test('a bad mode or non-array tags is an error', () => {
    // Arrange
    const badMode = { tags: TAGS, mode: 'latest' };
    const badTags = { tags: 'x', mode: 'image' };
    // Act
    const results = [pickTag(badMode), pickTag(badTags)];
    // Assert
    assert.deepEqual(
      results.map((r) => r.ok),
      [false, false]
    );
  });
});

describe('main', () => {
  test('prints the picked tag and exits 0', async () => {
    // Arrange
    const s = stubs();
    // Act
    const code = await main(['--image', 'python', '--runtime', '3.12', '--mode', 'image'], {
      fetch: okFetch(TAGS),
      log: s.log,
      error: s.error
    });
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(s.out.logs[0]), {
      ok: true,
      tag: '2-3.12-bookworm',
      source: 'https://mcr.microsoft.com/v2/devcontainers/python/tags/list'
    });
  });

  test('requests the list of the named image only', async () => {
    // Arrange
    const s = stubs();
    const urls = [];
    const fetchStub = async (url) => {
      urls.push(url);
      return { ok: true, status: 200, json: async () => ({ tags: ['1-bookworm'] }) };
    };
    // Act
    const code = await main(['--image', 'base', '--mode', 'dockerfile'], {
      fetch: fetchStub,
      log: s.log,
      error: s.error
    });
    // Assert
    assert.deepEqual(urls, ['https://mcr.microsoft.com/v2/devcontainers/base/tags/list']);
    assert.equal(code, 1);
  });

  test('rejects an image name with a path or space and exits 2', async () => {
    // Arrange
    const s = stubs();
    let called = false;
    const fetchStub = async () => {
      called = true;
    };
    // Act
    const code = await main(['--image', '../x y', '--mode', 'image'], { fetch: fetchStub, log: s.log, error: s.error });
    // Assert
    assert.equal(code, 2);
    assert.equal(called, false);
  });

  test('a failed request exits 1 with the status', async () => {
    // Arrange
    const s = stubs();
    // Act
    const code = await main(['--image', 'python', '--runtime', '3.12', '--mode', 'image'], {
      fetch: okFetch([], 503),
      log: s.log,
      error: s.error
    });
    // Assert
    assert.equal(code, 1);
    assert.match(JSON.parse(s.out.logs[0]).error, /503/);
  });

  test('an unknown mode exits 2', async () => {
    // Arrange
    const s = stubs();
    // Act
    const code = await main(['--image', 'python', '--mode', 'x'], { fetch: okFetch(TAGS), log: s.log, error: s.error });
    // Assert
    assert.equal(code, 2);
  });
});

describe('pickHubTag', () => {
  test('picks the highest plain semver from the API shape, numerically', () => {
    // Arrange
    const list = { results: [{ name: '1.9.0' }, { name: '1.10.2' }, { name: 'latest' }, { name: '1.10.2-rc1' }] };
    // Act
    const result = pickHubTag(list);
    // Assert
    assert.deepEqual(result, { ok: true, tag: '1.10.2' });
  });

  test('accepts a plain array and prefers a plain tag over a higher variant', () => {
    // Arrange
    const list = ['3.0.0-alpine', '2.5.1', '2.5.0'];
    // Act
    const result = pickHubTag(list);
    // Assert
    assert.deepEqual(result, { ok: true, tag: '2.5.1' });
  });

  test('falls back to the highest non-prerelease variant when no plain tag exists', () => {
    // Arrange
    const list = ['1.2.0-alpine', '1.3.0-alpine', '1.4.0-rc1', '1.5.0-beta.1', 'latest'];
    // Act
    const result = pickHubTag(list);
    // Assert
    assert.deepEqual(result, { ok: true, tag: '1.3.0-alpine' });
  });

  test('only latest, prerelease, or non-semver tags is an error', () => {
    // Arrange
    const list = ['latest', '1.0.0-rc1', 'stable', '1.2', '2.0.0-nightly'];
    // Act
    const result = pickHubTag(list);
    // Assert
    assert.equal(result.ok, false);
  });

  test('a non-list input is an error', () => {
    // Arrange
    const inputs = [null, 'x', { results: 'x' }];
    // Act
    const results = inputs.map((i) => pickHubTag(i).ok);
    // Assert
    assert.deepEqual(results, [false, false, false]);
  });
});

describe('main hub mode', () => {
  test('reads stdin JSON, prints the tag, and exits 0', async () => {
    // Arrange
    const s = stubs();
    // Act
    const code = await main(['--mode', 'hub'], {
      readStdin: async () => JSON.stringify({ results: [{ name: '8.0.1' }, { name: '8.0.10' }] }),
      log: s.log,
      error: s.error
    });
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(s.out.logs[0]), { ok: true, tag: '8.0.10' });
  });

  test('a plain array on stdin works and makes no request', async () => {
    // Arrange
    const s = stubs();
    let fetched = false;
    // Act
    const code = await main(['--mode', 'hub'], {
      readStdin: async () => '["1.0.0","1.1.0"]',
      fetch: async () => {
        fetched = true;
      },
      log: s.log,
      error: s.error
    });
    // Assert
    assert.equal(code, 0);
    assert.equal(fetched, false);
  });

  test('invalid JSON on stdin exits 2', async () => {
    // Arrange
    const s = stubs();
    // Act
    const code = await main(['--mode', 'hub'], { readStdin: async () => 'nope', log: s.log, error: s.error });
    // Assert
    assert.equal(code, 2);
    assert.equal(s.out.errors.length, 1);
  });

  test('no stable tag exits 1', async () => {
    // Arrange
    const s = stubs();
    // Act
    const code = await main(['--mode', 'hub'], { readStdin: async () => '["latest"]', log: s.log, error: s.error });
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(s.out.logs[0]).ok, false);
  });
});
