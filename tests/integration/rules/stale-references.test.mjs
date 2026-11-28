import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
// Placeholders and names the rules mention on purpose without shipping them.
const allowed = new Set(['MEMORY.md', 'husky.sh', 'AGENTS.md']);
const skipPrefixes = ['-', 'http', '~', '@', 'origin/'];
const fileLike = /\.(?:md|mjs|json|ya?ml|sh|js|toml)$|\/$|^\.?[\w-]+\/[\w./-]+$/;

const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], {
  cwd: root,
  encoding: 'utf8',
  timeout: 10000
})
  .split('\n')
  .filter(Boolean);
const known = new Set(files);
for (const file of files) {
  const parts = file.split('/');
  for (let i = 1; i < parts.length; i++) known.add(`${parts.slice(0, i).join('/')}/`);
}
const ignored = read('.gitignore')
  .split('\n')
  .filter((line) => line && !line.startsWith('#') && !/[*!]/.test(line));

const exists = (ref) =>
  allowed.has(ref) ||
  existsSync(join(root, ref)) ||
  [...known].some((path) => path === ref || path.endsWith(`/${ref}`)) ||
  ignored.some((rule) => ref === rule || (rule.endsWith('/') && ref.startsWith(rule)));

const references = (text) => {
  const found = [];
  for (const match of text.matchAll(/`([^`\s]+)`/g)) {
    const ref = match[1].replace(/[:#]\d[\d-]*$/, '');
    const placeholder = /[<>*${}|\\=]/.test(ref);
    const nonFile = skipPrefixes.some((prefix) => ref.startsWith(prefix)) || /^\.[a-z]+$/.test(ref);
    const skipped = placeholder || nonFile;
    if (!skipped && fileLike.test(ref)) found.push(ref);
  }
  return found;
};

const sources = [
  '.claude/CLAUDE.md',
  ...readdirSync(join(root, '.claude', 'rules'))
    .filter((file) => file.endsWith('.md'))
    .map((file) => `.claude/rules/${file}`),
  ...readdirSync(join(root, '.claude', 'skills'))
    .map((dir) => `.claude/skills/${dir}/references/evals.md`)
    .filter((rel) => existsSync(join(root, rel)))
];

describe('project rules and repo skill evals reference real files', () => {
  for (const source of sources) {
    test(`${source} names only existing files, directories, or ignored paths`, () => {
      // Arrange
      const refs = references(read(source));
      // Act
      const missing = [...new Set(refs.filter((ref) => !exists(ref)))];
      // Assert
      assert.deepEqual(missing, []);
    });
  }

  test('the reference extractor finds a file name and skips a placeholder', () => {
    // Arrange
    const text = 'See `lib/hook-io.mjs`, `<name>.md`, and `npm test`.';
    // Act
    const found = references(text);
    // Assert
    assert.deepEqual(found, ['lib/hook-io.mjs']);
  });

  test('a stale path is reported as missing', () => {
    // Arrange
    const ref = 'scripts/no-such-script.mjs';
    // Act
    const found = exists(ref);
    // Assert
    assert.equal(found, false);
  });
});
