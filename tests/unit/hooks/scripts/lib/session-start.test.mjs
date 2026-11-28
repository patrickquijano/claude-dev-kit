import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dateLine, instructionsLine, sessionStart } from '../../../../../hooks/scripts/lib/session-start.mjs';

function make(present = []) {
  const deps = {
    now: () => new Date(2026, 9, 13, 15, 5),
    exists: (path) => present.includes(path),
    projectDir: () => '/repo'
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

test('sessionStart adds the notice when a project instruction file exists', () => {
  // Arrange
  const { deps } = make(['/repo/AGENTS.md']);
  // Act
  const result = sessionStart({}, deps);
  // Assert
  assert.match(
    result.hookSpecificOutput.additionalContext,
    /\nProject instructions found; cdk skills defer to them\.$/
  );
});

test('sessionStart adds no notice when none exists', () => {
  // Arrange
  const { deps } = make();
  // Act
  const result = sessionStart({}, deps);
  // Assert
  assert.doesNotMatch(result.hookSpecificOutput.additionalContext, /Project instructions/);
});

test('instructionsLine finds CLAUDE.md at the root', () => {
  // Arrange
  const exists = (path) => path === '/repo/CLAUDE.md';
  // Act
  const result = instructionsLine('/repo', exists);
  // Assert
  assert.match(result, /^Project instructions found/);
});

test('instructionsLine finds a .claude/rules directory', () => {
  // Arrange
  const exists = (path) => path === '/repo/.claude/rules';
  // Act
  const result = instructionsLine('/repo', exists);
  // Assert
  assert.match(result, /^Project instructions found/);
});

test('instructionsLine is empty when nothing exists', () => {
  // Arrange
  const exists = () => false;
  // Act
  const result = instructionsLine('/repo', exists);
  // Assert
  assert.equal(result, '');
});

test('instructionsLine ignores unrelated files', () => {
  // Arrange
  const exists = (path) => path === '/repo/README.md';
  // Act
  const result = instructionsLine('/repo', exists);
  // Assert
  assert.equal(result, '');
});
