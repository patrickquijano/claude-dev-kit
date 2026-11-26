import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const root = new URL('../../../../../skills/', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, root), 'utf8');
const checks = read('audit-subagent/references/checks.md');
const snapshot = read('build-subagent/references/docs-snapshot.md');
const checker = read('build-subagent/scripts/check-agent.mjs');

const quoted = (text) => [...text.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
const ticked = (text) => [...text.matchAll(/`([a-z]+)`/g)].map((m) => m[1]);
const gateRows = (text) => text.split('\n').filter((line) => /^\| v\d+\.\d+\.\d+ /.test(line));

describe('audit-subagent checks.md copied facts', () => {
  test('the F9 colour list equals the docs snapshot and check-agent', () => {
    // Arrange
    const snapshotRow = snapshot.split('\n').find((line) => line.startsWith('| `color`'));
    const checkerLine = checker.split('\n').find((line) => line.trim().startsWith('color: ['));
    const f9Row = checks.split('\n').find((line) => line.startsWith('| F9 '));
    // Act
    const fromSnapshot = ticked(snapshotRow.split('|')[2]).slice(0, 8);
    const fromChecker = quoted(checkerLine);
    const fromChecks = ticked(f9Row.split('|')[4]).slice(0, 8);
    // Assert
    assert.equal(fromSnapshot.length, 8);
    assert.deepEqual(fromChecker, fromSnapshot);
    assert.deepEqual(fromChecks, fromSnapshot);
  });

  test('the version-gate table equals the docs snapshot table', () => {
    // Arrange
    const rows = { checks, snapshot };
    // Act
    const fromChecks = gateRows(rows.checks);
    const fromSnapshot = gateRows(rows.snapshot);
    // Assert
    assert.ok(fromSnapshot.length > 0);
    assert.deepEqual(fromChecks, fromSnapshot);
  });

  test('checks.md names no build-subagent path', () => {
    // Arrange
    const text = checks;
    // Act
    const found = text.includes('build-subagent/');
    // Assert
    assert.equal(found, false);
  });

  test('a drifted colour list or gate row is detected', () => {
    // Arrange
    const drifted = checks.replace('v2.1.302', 'v2.1.303').replace('`pink`, ', '');
    // Act
    const gatesMatch = gateRows(drifted).join('\n') === gateRows(snapshot).join('\n');
    const f9Row = drifted.split('\n').find((line) => line.startsWith('| F9 '));
    const snapshotRow = snapshot.split('\n').find((line) => line.startsWith('| `color`'));
    const f9Matches =
      ticked(f9Row.split('|')[4]).slice(0, 8).join() === ticked(snapshotRow.split('|')[2]).slice(0, 8).join();
    // Assert
    assert.equal(gatesMatch, false);
    assert.equal(f9Matches, false);
  });
});
