import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'skills', 'audit-skill', 'SKILL.md');

describe('audit-skill closes every open item', () => {
  const cases = {
    'names the researcher subagent': /cdk:topic-researcher/,
    'has a Decisions: Output line': /^Decisions: </m,
    'offers Decline the rest at the cap': /Decline the rest/,
    'ends ACCEPTED only with no open item': /ACCEPTED[^.\n]*and no open item/,
    'defines the item ledger': /Item ledger/,
    'reports item counts': /^Items: </m,
    're-plans unmapped fix IDs': /Unmapped IDs → respawn the planner once/,
    'checks line coverage': /Coverage: Glob/
  };

  for (const [name, pattern] of Object.entries(cases)) {
    test(name, () => {
      // Arrange
      const text = readFileSync(skillPath, 'utf8');
      // Act
      const found = pattern.test(text);
      // Assert
      assert.ok(found, `audit-skill lost: ${pattern}`);
    });
  }
});

describe('audit-skill rubric reports line coverage and a deduction map', () => {
  const rubricPath = join(dirname(skillPath), 'references', 'rubric.md');

  test('lists report sections 10 and 11', () => {
    // Arrange
    const text = readFileSync(rubricPath, 'utf8');
    // Act
    const sections = text.split('## Required report sections')[1] ?? '';
    // Assert
    assert.match(sections, /^10\. Line coverage/m);
    assert.match(sections, /^11\. Deduction map/m);
  });
});
