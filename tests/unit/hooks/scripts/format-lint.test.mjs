import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatLint } from '../../../../hooks/scripts/format-lint.mjs';

const ok = { status: 0, stdout: '', stderr: '' };
const base = (over = {}) => ({
  isFile: () => true,
  available: () => true,
  win: false,
  realpath: (p) => p,
  env: { CLAUDE_PROJECT_DIR: '/p' },
  cwd: () => '/elsewhere',
  readFile: () => '',
  pid: 7,
  run: () => ok,
  ...over
});
const event = (file) => ({ tool_input: { file_path: file } });

test('formatLint: reports every step as passed for a clean markdown file', () => {
  // Arrange
  const deps = base();
  // Act
  const result = formatLint(event('/p/docs/a.md'), deps);
  // Assert
  assert.deepEqual(result, { systemMessage: '✅ Format: docs/a.md | ✅ Lint: docs/a.md' });
});

test('formatLint: runs the formatter through npx with the relative target', () => {
  // Arrange
  const calls = [];
  const deps = base({ run: (cmd, argv, cwd) => (calls.push([cmd, argv, cwd]), ok) });
  // Act
  formatLint(event('/p/docs/a.md'), deps);
  // Assert
  assert.deepEqual(calls[0], ['npx', ['--no-install', 'prettier', '-w', '--ignore-unknown', 'docs/a.md'], '/p']);
});

test('formatLint: blocks with the tool output when a step fails', () => {
  // Arrange
  const deps = base({
    run: (cmd, argv) => (argv.includes('markdownlint-cli2') ? { status: 1, stdout: 'MD001', stderr: '' } : ok)
  });
  // Act
  const result = formatLint(event('/p/a.md'), deps);
  // Assert
  assert.equal(result.decision, 'block');
  assert.match(result.systemMessage, /❌ Lint: a\.md/);
  assert.match(result.reason, /Format\/lint issues in a\.md/);
  assert.match(result.reason, /MD001/);
});

test('formatLint: writes stdout back to the file for stdout-based formatters', () => {
  // Arrange
  const writes = [];
  const renames = [];
  const deps = base({
    available: (step) => step.cmd === 'xmlstarlet',
    run: () => ({ status: 0, stdout: '<a/>', stderr: '' }),
    writeFile: (f, data) => writes.push([f, data]),
    rename: (from, to) => renames.push([from, to])
  });
  // Act
  formatLint(event('/p/x.xml'), deps);
  // Assert
  assert.deepEqual(writes, [['/p/x.xml.7.tmp', '<a/>']]);
  assert.deepEqual(renames, [['/p/x.xml.7.tmp', '/p/x.xml']]);
});

test('formatLint: returns null when the file does not exist', () => {
  // Arrange
  const deps = base({ isFile: () => false });
  // Act
  const result = formatLint(event('/p/missing.md'), deps);
  // Assert
  assert.equal(result, null);
});

test('formatLint: returns null when file_path is not a string', () => {
  // Arrange
  const input = { tool_input: { file_path: 42 } };
  // Act
  const result = formatLint(input, base());
  // Assert
  assert.equal(result, null);
});

test('formatLint: returns null for a file outside the project', () => {
  // Arrange
  const deps = base();
  // Act
  const result = formatLint(event('/other/a.md'), deps);
  // Assert
  assert.equal(result, null);
});

test('formatLint: returns null for a file inside node_modules', () => {
  // Arrange
  const deps = base();
  // Act
  const result = formatLint(event('/p/node_modules/x/a.md'), deps);
  // Assert
  assert.equal(result, null);
});

test('formatLint: returns null when the path cannot be resolved', () => {
  // Arrange
  const deps = base({
    realpath: () => {
      throw new Error('ENOENT');
    }
  });
  // Act
  const result = formatLint(event('/p/a.md'), deps);
  // Assert
  assert.equal(result, null);
});

test('formatLint: returns null for an extension with no tools', () => {
  // Arrange
  const deps = base();
  // Act
  const result = formatLint(event('/p/a.unknownext'), deps);
  // Assert
  assert.equal(result, null);
});

test('formatLint: returns null when no tool is available', () => {
  // Arrange
  const deps = base({ available: () => false });
  // Act
  const result = formatLint(event('/p/a.md'), deps);
  // Assert
  assert.equal(result, null);
});

test('formatLint: skips a Dockerfile with a heredoc', () => {
  // Arrange
  const deps = base({ readFile: () => 'FROM x\nRUN <<EOF\necho\nEOF\n' });
  // Act
  const result = formatLint(event('/p/Dockerfile'), deps);
  // Assert
  assert.equal(result, null);
});

test('formatLint: returns null for a quoted path on Windows', () => {
  // Arrange
  const deps = base({ win: true });
  // Act
  const result = formatLint(event('/p/a"b.md'), deps);
  // Assert
  assert.equal(result, null);
});
