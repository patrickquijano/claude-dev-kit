import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const workflow = readFileSync(new URL('../../../.github/workflows/release.yml', import.meta.url), 'utf8');
const jobsText = workflow.slice(workflow.indexOf('\njobs:\n'));
const job = (name) => {
  const lines = jobsText.split('\n');
  const start = lines.indexOf(`  ${name}:`);
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^ {2}[a-z-]+:$/.test(l));
  return `${(end === -1 ? rest : rest.slice(0, end)).join('\n')}\n`;
};

describe('release.yml job split', () => {
  test('has a verify job and a release job', () => {
    // Arrange
    const names = [...jobsText.matchAll(/^ {2}([a-z-]+):$/gm)].map((m) => m[1]);
    // Act
    const found = names.filter((n) => n === 'verify' || n === 'release');
    // Assert
    assert.deepEqual(found, ['verify', 'release']);
  });

  test('verify reads contents only and installs without scripts', () => {
    // Arrange
    const verify = job('verify');
    // Act
    const permissions = /permissions:\n {6}contents: read\n/.test(verify);
    const install = /run: npm ci --ignore-scripts\n/.test(verify);
    // Assert
    assert.ok(permissions, 'verify must have contents: read');
    assert.ok(install, 'verify must run npm ci --ignore-scripts');
    assert.equal(/contents: write/.test(verify), false);
  });

  test('verify runs the tests and the audit', () => {
    // Arrange
    const verify = job('verify');
    // Act
    const tests = /run: npm test\n/.test(verify);
    const audit = /run: npm run audit\n/.test(verify);
    // Assert
    assert.ok(tests, 'verify must run npm test');
    assert.ok(audit, 'verify must run npm run audit');
  });

  test('release needs verify, writes contents, and installs nothing', () => {
    // Arrange
    const release = job('release');
    // Act
    const needs = /^ {4}needs: verify$/m.test(release);
    const write = /permissions:\n {6}contents: write\n/.test(release);
    const installs = /npm (ci|install)/.test(release);
    // Assert
    assert.ok(needs, 'release must need verify');
    assert.ok(write, 'release must have contents: write');
    assert.equal(installs, false);
  });

  test('both jobs check out the pushed sha, never the tag ref', () => {
    // Arrange
    const jobs = ['verify', 'release'].map(job);
    // Act
    const sha = jobs.map((j) => j.split('\n').filter((l) => l.trim() === 'ref: ${{ github.sha }}').length);
    const tagRef = jobs.map((j) => j.split('\n').some((l) => l.trim().startsWith('ref:') && l.includes('refs/tags/')));
    // Assert
    assert.deepEqual(sha, [1, 1]);
    assert.deepEqual(tagRef, [false, false]);
  });

  test('release asserts the tag commit equals the checked-out HEAD before creating the release', () => {
    // Arrange
    const lines = job('release').split('\n');
    const index = (needle) => lines.findIndex((l) => l.includes(needle));
    // Act
    const fetch = index('git fetch --no-tags origin');
    const revParse = index('git rev-parse "refs/tags/${TAG}^{commit}"');
    const compare = index('"$tag_sha" != "$(git rev-parse HEAD)"');
    const create = index('gh release create');
    // Assert
    assert.ok(fetch !== -1 && fetch < revParse, 'release must fetch the tag before rev-parse');
    assert.ok(revParse < compare, 'release must compare the rev-parse result');
    assert.ok(compare !== -1 && compare < create, 'release must assert before gh release create');
  });
});
