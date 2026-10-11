import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { cmpSemver, detectPrefix, isSemver, parseChangelog, plan } from './changelog-release.mjs';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'changelog-release.mjs');
const REPO = 'https://github.com/o/r';

const CL = `# Changelog

## [Unreleased]

### Added

- next

## [1.1.0] - 2026-02-01

### Added

- b

### Fixed

- c

## [1.0.0] - 2026-01-01

### Added

- a

[Unreleased]: ${REPO}/compare/v1.1.0...HEAD
[1.1.0]: ${REPO}/compare/v1.0.0...v1.1.0
[1.0.0]: ${REPO}/releases/tag/v1.0.0
`;

const codes = (r) => r.errors.map((e) => e.code);

test('isSemver and cmpSemver follow SemVer 2.0.0', () => {
  assert.ok(isSemver('1.0.0') && isSemver('1.0.0-rc.1+build.5'));
  assert.ok(!isSemver('1.0') && !isSemver('01.0.0') && !isSemver('v1.0.0'));
  assert.ok(cmpSemver('1.0.0', '1.0.0-rc.1') > 0);
  assert.ok(cmpSemver('1.0.0-alpha.2', '1.0.0-alpha.10') < 0);
  assert.ok(cmpSemver('1.0.0-alpha', '1.0.0-alpha.1') < 0);
  assert.equal(cmpSemver('1.0.0+a', '1.0.0+b'), 0);
});

test('parseChangelog skips headings in code fences and strips link references', () => {
  const { sections, refs } = parseChangelog(
    '## [1.0.0] - 2026-01-01\n\n```\n## [9.9.9] - 2026-01-02\n```\n\n[1.0.0]: http://x/v1.0.0\n'
  );
  assert.deepEqual(
    sections.map((s) => s.label),
    ['1.0.0']
  );
  assert.ok(!sections[0].body.includes('http://x'));
  assert.equal(refs['1.0.0'], 'http://x/v1.0.0');
});

test('plan picks the top released section with notes and a compare link', () => {
  const r = plan({ changelog: CL, tags: ['v1.0.0'], repoUrl: REPO });
  assert.equal(r.ok, true);
  assert.equal(r.version, '1.1.0');
  assert.equal(r.date, '2026-02-01');
  assert.equal(r.tag, 'v1.1.0');
  assert.equal(r.prefixSource, 'tags');
  assert.ok(r.notes.startsWith('### Added\n\n- b'));
  assert.ok(!r.notes.includes('next') && !r.notes.includes('- a'));
  assert.ok(r.notes.endsWith(`**Full Changelog**: ${REPO}/compare/v1.0.0...v1.1.0\n`));
});

test('no compare link when the previous tag does not exist or no repo url is given', () => {
  assert.ok(!plan({ changelog: CL, tags: [], prefix: 'v', repoUrl: REPO }).notes.includes('Full Changelog'));
  assert.ok(!plan({ changelog: CL, tags: ['v1.0.0'] }).notes.includes('Full Changelog'));
});

test('prefix: bare tags, mixed tags, none, changelog links, flag', () => {
  assert.equal(plan({ changelog: CL, tags: ['1.0.0'] }).tag, '1.1.0');
  assert.deepEqual(codes(plan({ changelog: CL, tags: ['1.0.0', 'v0.9.0'] })), ['prefix-ambiguous']);
  assert.deepEqual(codes(plan({ changelog: CL.replace(/^\[.*$/gm, ''), tags: ['latest', 'nightly'] })), [
    'prefix-unknown'
  ]);
  assert.equal(plan({ changelog: CL.replace(/v(\d)/g, '$1') }).tag, '1.1.0');
  assert.equal(detectPrefix([], { '1.0.0': `${REPO}/compare/v0.9.0...v1.0.0` }, ['1.0.0']).prefix, 'v');
  assert.equal(plan({ changelog: CL, tags: ['latest'] }).prefixSource, 'changelog links');
  assert.equal(plan({ changelog: CL, tags: ['1.0.0'], prefix: 'v' }).tag, 'v1.1.0');
  assert.equal(plan({ changelog: CL, tags: ['v1.0.0'], prefix: 'none' }).tag, '1.1.0');
  assert.deepEqual(codes(plan({ changelog: CL, prefix: 'rel-' })), ['invalid-prefix']);
});

test('unreleased-only, empty, and missing sections are rejected', () => {
  assert.deepEqual(codes(plan({ changelog: '## [Unreleased]\n\n- x\n' })), ['unreleased-only']);
  assert.deepEqual(codes(plan({ changelog: '# Changelog\n' })), ['no-release']);
});

test('invalid version, date, state, and notes are rejected', () => {
  const sec = (h, body = '- x') => `## [Unreleased]\n\n${h}\n\n${body}\n`;
  assert.deepEqual(codes(plan({ changelog: sec('## [1.0] - 2026-01-01'), prefix: 'v' })), ['invalid-semver']);
  assert.deepEqual(codes(plan({ changelog: sec('## [1.0.0] - 2026-02-30'), prefix: 'v' })), ['invalid-date']);
  assert.deepEqual(codes(plan({ changelog: sec('## [1.0.0]'), prefix: 'v' })), ['invalid-date']);
  assert.ok(codes(plan({ changelog: sec('## [1.0.0] - Unreleased'), prefix: 'v' })).includes('unreleased'));
  assert.deepEqual(codes(plan({ changelog: sec('## [1.0.0] - 2026-01-01 [YANKED]'), prefix: 'v' })), ['yanked']);
  assert.deepEqual(codes(plan({ changelog: sec('## [1.0.0-rc.1] - 2026-01-01'), prefix: 'v' })), ['prerelease']);
  assert.deepEqual(codes(plan({ changelog: sec('## [1.0.0] - 2026-01-01', ''), prefix: 'v' })), ['empty-notes']);
});

test('out-of-order and duplicate versions are rejected', () => {
  const swapped = '## [1.0.0] - 2026-01-01\n\n- a\n\n## [1.1.0] - 2026-02-01\n\n- b\n';
  assert.deepEqual(codes(plan({ changelog: swapped, prefix: 'v' })), ['not-newest']);
  const dup = '## [1.0.0] - 2026-01-01\n\n- a\n\n## [1.0.0] - 2026-01-01\n\n- a\n';
  assert.deepEqual(codes(plan({ changelog: dup, prefix: 'v' })), ['duplicate-version']);
});

test('CLI reads tags from git, writes notes, and exits 1 on errors', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'cl-rel-'));
  try {
    const sh = (...a) => spawnSync('git', a, { cwd: dir });
    sh('init', '-q');
    sh('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init');
    sh('tag', '1.0.0');
    writeFileSync(path.join(dir, 'CHANGELOG.md'), CL);
    const notes = path.join(dir, 'notes.md');
    const ok = spawnSync('node', [SCRIPT, 'plan', '--repo-url', REPO, '--notes-out', notes], { cwd: dir });
    const res = JSON.parse(ok.stdout);
    assert.equal(ok.status, 0);
    assert.equal(res.tag, '1.1.0');
    assert.equal(readFileSync(notes, 'utf8'), res.notes);
    assert.match(res.notes, /compare\/1\.0\.0\.\.\.1\.1\.0/);
    const bad = spawnSync('node', [SCRIPT, 'plan', '--changelog', 'missing.md'], { cwd: dir });
    assert.equal(bad.status, 1);
    assert.equal(JSON.parse(bad.stdout).errors[0].code, 'no-changelog');
    assert.equal(spawnSync('node', [SCRIPT], { cwd: dir }).status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
