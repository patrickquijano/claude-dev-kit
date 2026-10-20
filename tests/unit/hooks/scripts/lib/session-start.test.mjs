import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dateLine, sessionStart } from '../../../../../hooks/scripts/lib/session-start.mjs';

function make({ configured = false, present = false } = {}) {
  const deps = {
    env: { CLAUDE_PROJECT_DIR: '/repo', CLAUDE_PLUGIN_ROOT: '/plugin' },
    cwd: () => '/cwd',
    now: () => new Date(2026, 9, 13, 15, 5),
    defaultRoot: () => '/default',
    realpathSync: (p) => p,
    graphifyConfigured: () => configured,
    graphifyFilesExist: () => present
  };
  return { deps };
}

test('dateLine formats the weekday, date, and 12-hour time', () => {
  // Arrange
  const now = new Date(2026, 9, 13, 15, 5);
  // Act
  const result = dateLine(now);
  // Assert
  assert.equal(result, 'Today is Tuesday, October, 13, 2026 and the current time is 3:05 PM');
});

test('dateLine marks the morning as AM', () => {
  // Arrange
  const now = new Date(2026, 0, 2, 3, 9);
  // Act
  const result = dateLine(now);
  // Assert
  assert.match(result, /3:09 AM$/);
});

test('dateLine does not leak the previous day across midnight', () => {
  // Arrange
  const now = new Date(2026, 0, 2, 0, 0);
  // Act
  const result = dateLine(now);
  // Assert
  assert.match(result, /Friday, January, 2, 2026 .* 12:00 AM$/);
});

test('dateLine defaults to the current time without throwing', () => {
  // Arrange
  const pattern = /^Today is \w+, \w+, \d+, \d{4} and the current time is \d+:\d{2} (AM|PM)$/;
  // Act
  const result = dateLine();
  // Assert
  assert.match(result, pattern);
});

test('sessionStart returns the date line as additional context', () => {
  // Arrange
  const { deps } = make();
  // Act
  const result = sessionStart({}, deps);
  // Assert
  assert.equal(result.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(result.hookSpecificOutput.additionalContext, /^Today is Tuesday, October, 13, 2026/);
});

test('sessionStart points at the Graphify rules file when a graph is ready', () => {
  // Arrange
  const { deps } = make({ configured: true, present: true });
  // Act
  const result = sessionStart({}, deps);
  // Assert
  assert.match(
    result.hookSpecificOutput.additionalContext,
    /Graphify is set up; read \/plugin\/skills\/setup-graphify\/assets\/graphify-rules\.md before navigating code\./
  );
  assert.doesNotMatch(result.hookSpecificOutput.additionalContext, /RULES/);
});

test('sessionStart falls back to the default plugin root', () => {
  // Arrange
  const { deps } = make({ configured: true, present: true });
  delete deps.env.CLAUDE_PLUGIN_ROOT;
  // Act
  const result = sessionStart({}, deps);
  // Assert
  assert.match(result.hookSpecificOutput.additionalContext, /\/default\/skills\/setup-graphify/);
});

test('sessionStart omits Graphify rules when Graphify is not configured', () => {
  // Arrange
  const { deps } = make({ configured: false, present: true });
  // Act
  const result = sessionStart({}, deps);
  // Assert
  assert.doesNotMatch(result.hookSpecificOutput.additionalContext, /Graphify/);
});

test('sessionStart omits Graphify rules when the graph files are missing', () => {
  // Arrange
  const { deps } = make({ configured: true, present: false });
  // Act
  const result = sessionStart({}, deps);
  // Assert
  assert.doesNotMatch(result.hookSpecificOutput.additionalContext, /Graphify/);
});

test('sessionStart lets a missing project directory bubble', () => {
  // Arrange
  const { deps } = make();
  deps.realpathSync = () => {
    throw new Error('ENOENT');
  };
  // Act
  const act = () => sessionStart({}, deps);
  // Assert
  assert.throws(act, /ENOENT/);
});

for (const source of ['startup', 'clear', 'fork', 'resume', 'compact', undefined]) {
  test(`sessionStart adds no marker text when a ship-release marker file exists on ${source}`, () => {
    // Arrange
    const deps = make().deps;
    deps.existsSync = () => true;
    // Act
    const result = sessionStart({ source }, deps);
    // Assert
    assert.doesNotMatch(result.hookSpecificOutput.additionalContext, /marker/);
  });
}
