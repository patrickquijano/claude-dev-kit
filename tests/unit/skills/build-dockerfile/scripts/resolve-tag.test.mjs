import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { MAX_PAGES, main, pickTag, resolveTag } from '../../../../../skills/build-dockerfile/scripts/resolve-tag.mjs';

const page = (names, next = null) => ({ results: names.map((name) => ({ name })), next });

function pager(pages) {
  const urls = [];
  const fetchJson = async (url) => {
    urls.push(url);
    return pages[urls.length - 1];
  };
  return { fetchJson, urls };
}

describe('pickTag', () => {
  test('takes the highest numeric version for the variant', () => {
    // Arrange
    const names = ['22.4.0-bookworm-slim', '22.10.1-bookworm-slim', '22.9.9-bookworm-slim'];
    // Act
    const result = pickTag({ names, runtime: '22', variant: 'bookworm-slim' });
    // Assert
    assert.deepEqual(result, { ok: true, tag: '22.10.1-bookworm-slim' });
  });

  test('ignores pre-release, floating, and other-variant tags', () => {
    // Arrange
    const names = ['22.5.0-rc1-bookworm-slim', '22-bookworm-slim', '22.4.0-alpine', 'latest', '22.3.0-bookworm-slim'];
    // Act
    const result = pickTag({ names, runtime: '22', variant: 'bookworm-slim' });
    // Assert
    assert.deepEqual(result, { ok: true, tag: '22.3.0-bookworm-slim' });
  });

  test('matches ubuntu release tags only', () => {
    // Arrange
    const names = ['24.04', '22.04', '24.10-rc', 'noble'];
    // Act
    const result = pickTag({ names, variant: 'ubuntu' });
    // Assert
    assert.deepEqual(result, { ok: true, tag: '24.04' });
  });

  test('requires the runtime major.minor prefix', () => {
    // Arrange
    const names = ['3.13.2-slim-bookworm', '3.12.9-slim-bookworm'];
    // Act
    const result = pickTag({ names, runtime: '3.12', variant: 'slim-bookworm' });
    // Assert
    assert.deepEqual(result, { ok: true, tag: '3.12.9-slim-bookworm' });
  });

  test('reports no match', () => {
    // Arrange
    const names = ['1.0.0-alpine'];
    // Act
    const result = pickTag({ names, runtime: '2', variant: 'alpine' });
    // Assert
    assert.equal(result.ok, false);
  });

  test('rejects a non-array list and an unsafe variant', () => {
    // Arrange
    const bad = [
      { names: 'x', variant: 'alpine' },
      { names: [], variant: '../x' }
    ];
    // Act
    const results = bad.map(pickTag);
    // Assert
    assert.deepEqual(
      results.map((r) => r.ok),
      [false, false]
    );
  });
});

describe('resolveTag', () => {
  test('queries the official namespace and returns the tag', async () => {
    // Arrange
    const { fetchJson, urls } = pager([page(['22.4.0-bookworm-slim', '22.5.1-bookworm-slim'])]);
    // Act
    const result = await resolveTag({ image: 'node', runtime: '22', variant: 'bookworm-slim' }, fetchJson);
    // Assert
    assert.deepEqual(result, { ok: true, tag: '22.5.1-bookworm-slim' });
    assert.equal(urls[0], 'https://hub.docker.com/v2/namespaces/library/repositories/node/tags?page_size=100&name=22');
  });

  test('follows next links and keeps the highest across pages', async () => {
    // Arrange
    const next = 'https://hub.docker.com/v2/namespaces/library/repositories/node/tags?page=2';
    const { fetchJson, urls } = pager([page(['22.1.0-alpine3.20'], next), page(['22.9.0-alpine3.20'])]);
    // Act
    const result = await resolveTag({ image: 'node', runtime: '22', variant: 'alpine3.20' }, fetchJson);
    // Assert
    assert.equal(result.tag, '22.9.0-alpine3.20');
    assert.equal(urls[1], next);
  });

  test('stops at the page cap', async () => {
    // Arrange
    const next = 'https://hub.docker.com/v2/x?page=n';
    const fetchJson = async () => page(['1.0.0-other'], next);
    // Act
    const result = await resolveTag({ image: 'node', runtime: '22', variant: 'alpine' }, fetchJson);
    // Assert
    assert.equal(result.ok, false);
    assert.ok(result.error.includes(String(MAX_PAGES)));
  });

  test('refuses a next link off Docker Hub', async () => {
    // Arrange
    const { fetchJson, urls } = pager([page(['22.1.0-alpine'], 'https://evil.example/tags')]);
    // Act
    const result = await resolveTag({ image: 'node', runtime: '22', variant: 'alpine' }, fetchJson);
    // Assert
    assert.equal(urls.length, 1);
    assert.equal(result.tag, '22.1.0-alpine');
  });

  test('rejects an invalid image and a malformed response', async () => {
    // Arrange
    const { fetchJson } = pager([{ nope: true }]);
    // Act
    const badImage = await resolveTag({ image: 'a b', variant: 'alpine' }, fetchJson);
    const badBody = await resolveTag({ image: 'node', variant: 'alpine' }, fetchJson);
    // Assert
    assert.equal(badImage.ok, false);
    assert.equal(badBody.error, 'unexpected tags response');
  });
});

describe('main', () => {
  const stubs = (pages = []) => {
    const out = { logs: [], errors: [] };
    const { fetchJson } = pager(pages);
    return { out, deps: { fetchJson, log: (t) => out.logs.push(t), error: (t) => out.errors.push(t) } };
  };

  test('prints the resolved tag, exit 0', async () => {
    // Arrange
    const { out, deps } = stubs([page(['1.2.3-slim'])]);
    // Act
    const code = await main(['--image', 'tool', '--variant', 'slim'], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(out.logs[0]), { ok: true, tag: '1.2.3-slim' });
  });

  test('exits 1 when nothing matches', async () => {
    // Arrange
    const { out, deps } = stubs([page(['latest'])]);
    // Act
    const code = await main(['--image', 'tool', '--variant', 'slim'], deps);
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(out.logs[0]).ok, false);
  });

  test('exits 2 with usage when --variant is missing', async () => {
    // Arrange
    const { out, deps } = stubs();
    // Act
    const code = await main(['--image', 'tool'], deps);
    // Assert
    assert.equal(code, 2);
    assert.match(out.errors[0], /usage:/);
  });

  test('exits 2 on an unknown flag', async () => {
    // Arrange
    const { out, deps } = stubs();
    // Act
    const code = await main(['--image', 'tool', '--variant', 'slim', '--bogus', '1'], deps);
    // Assert
    assert.equal(code, 2);
    assert.equal(out.logs.length, 0);
  });
});
