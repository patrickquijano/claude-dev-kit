import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const callers = {
  'audit-skill':
    /^- Every fix to a target skill.*a cancel keeps implement-spec's reason.*`Stopped: <step>: user cancelled`/m,
  'audit-subagent':
    /^- Every fix to a target subagent.*a cancel keeps implement-spec's reason.*`Stopped: <step>: user cancelled`/m,
  'build-skill':
    /^- Before each implement-spec invocation.*a cancel keeps implement-spec's reason.*`Stopped: <step>: user cancelled`/m,
  'build-subagent':
    /^- Every write, including.*a cancel keeps implement-spec's reason.*`Stopped: <step>: user cancelled`/m,
  'update-readme':
    /^- Every write in steps 11.*a cancel keeps implement-spec's reason.*`Stopped: <step>: user cancelled`/m,
  'update-rules':
    /^- Every write in step 5 and step 8.*a cancel keeps implement-spec's reason.*`Stopped: <step>: user cancelled`/m
};

describe('implement-spec callers keep the cancel reason', () => {
  for (const [skill, keeps] of Object.entries(callers)) {
    test(`${skill} says a cancel keeps implement-spec's reason`, () => {
      // Arrange
      const text = readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8');
      // Act
      const found = keeps.test(text);
      // Assert
      assert.ok(found, 'cancel keeps-reason wording missing');
      assert.doesNotMatch(text, /cancel carries (no reason|none)/);
    });
  }
});
