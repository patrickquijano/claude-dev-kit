import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'skills',
  'audit-subagent',
  'SKILL.md'
);

describe('audit-subagent closes every open item', () => {
  const cases = {
    'names the researcher subagent': /cdk:topic-researcher/,
    'scores through the subagent-audit kind': /kind `subagent-audit`/,
    'has a Decisions: Output line': /^Decisions: </m,
    'offers Decline the rest at the cap': /Decline the rest/,
    'ends ACCEPTED only with no open item': /ACCEPTED[^.\n]*and no open item/
  };

  for (const [name, pattern] of Object.entries(cases)) {
    test(name, () => {
      // Arrange
      const text = readFileSync(skillPath, 'utf8');
      // Act
      const found = pattern.test(text);
      // Assert
      assert.ok(found, `audit-subagent lost: ${pattern}`);
    });
  }
});
