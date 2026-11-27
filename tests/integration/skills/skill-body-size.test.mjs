import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { countText } from '../../../skills/audit-skill/scripts/count.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const skillsDir = join(root, 'skills');
const MAX_BODY_CHARS = 20000;

describe('skill bodies stay within 5,000 tokens', () => {
  for (const name of readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)) {
    test(`${name} body is at most ${MAX_BODY_CHARS} chars`, () => {
      // Arrange
      const text = readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf8');
      // Act
      const { bodyChars } = countText(text);
      // Assert
      assert.ok(bodyChars <= MAX_BODY_CHARS, `${name} body is ${bodyChars} chars`);
    });
  }
});
