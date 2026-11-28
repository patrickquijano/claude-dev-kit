import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseReport, problems } from '../../../../../hooks/scripts/lib/subagent-report.mjs';

const report = (proof, status = 'done') =>
  `Status: ${status}\nChanged: a.mjs\nTests: a.test.mjs — updated\n${proof}Pinned: none\nDeviations: none\n`;
const PASS = 'Proof:\n- tests: exit 0\n- lint: exit 0\n';

describe('parseReport', () => {
  test('reads the status and each proof entry', () => {
    // Arrange
    const text = report(PASS);
    // Act
    const parsed = parseReport(text);
    // Assert
    assert.equal(parsed.status, 'done');
    assert.deepEqual(
      parsed.proof.map(({ name, exit }) => [name, exit]),
      [
        ['tests', 0],
        ['lint', 0]
      ]
    );
  });

  test('marks a skipped entry with its reason', () => {
    // Arrange
    const text = report('Proof:\n- tests: skipped (no runner)\n- lint: exit 0\n');
    // Act
    const [first] = parseReport(text).proof;
    // Assert
    assert.equal(first.skipped, true);
    assert.equal(first.exit, null);
  });

  test('returns no proof and a null status for unrelated text', () => {
    // Arrange
    const text = 'done, all good';
    // Act
    const parsed = parseReport(text);
    // Assert
    assert.deepEqual(parsed, { status: null, proof: [] });
  });

  test('ignores tests and lint lines outside the Proof section', () => {
    // Arrange
    const text = `${report(PASS)}Self-check:\n- tests: exit 9\n`;
    // Act
    const { proof } = parseReport(text);
    // Assert
    assert.equal(proof.length, 2);
  });
});

describe('problems', () => {
  test('accepts a report whose proof all exited 0', () => {
    // Arrange
    const text = report(PASS);
    // Act
    const found = problems(text);
    // Assert
    assert.deepEqual(found, []);
  });

  test('accepts a skipped entry that names a reason', () => {
    // Arrange
    const text = report('Proof:\n- tests: exit 0\n- lint: skipped (brief scopes none)\n');
    // Act
    const found = problems(text);
    // Assert
    assert.deepEqual(found, []);
  });

  test('accepts a blocked report with no proof', () => {
    // Arrange
    const text = 'Status: blocked\nChanged: none\nQuestion: which file?\n';
    // Act
    const found = problems(text);
    // Assert
    assert.deepEqual(found, []);
  });

  test('rejects a report with no Proof section', () => {
    // Arrange
    const text = 'Status: done\nChanged: a.mjs\n';
    // Act
    const found = problems(text);
    // Assert
    assert.match(found[0], /no `Proof:` entries/);
  });

  test('rejects a nonzero exit code and names it', () => {
    // Arrange
    const text = report('Proof:\n- tests: exit 1\n- lint: exit 0\n');
    // Act
    const found = problems(text);
    // Assert
    assert.deepEqual(found, ['`Proof:` tests exited 1']);
  });

  test('rejects an entry that is neither exit nor skipped with reason', () => {
    // Arrange
    const text = report('Proof:\n- tests: passed\n- lint: skipped\n');
    // Act
    const found = problems(text);
    // Assert
    assert.equal(found.length, 2);
  });
});
