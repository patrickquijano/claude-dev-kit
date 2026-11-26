import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter as parseSkill } from '../../../skills/build-skill/scripts/validate-skill.mjs';
import { parseFrontmatter as parseAgent } from '../../../skills/build-subagent/scripts/check-agent.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const skillFiles = (dir) =>
  existsSync(join(root, dir))
    ? readdirSync(join(root, dir), { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && existsSync(join(root, dir, entry.name, 'SKILL.md')))
        .map((entry) => `${dir}/${entry.name}/SKILL.md`)
    : [];
const agentFiles = readdirSync(join(root, 'agents'))
  .filter((name) => name.endsWith('.md'))
  .map((name) => `agents/${name}`);
const files = [...skillFiles('skills'), ...skillFiles('.claude/skills'), ...agentFiles];

const failures = (parse) => {
  const failed = [];
  for (const file of files) {
    try {
      parse(readFileSync(join(root, file), 'utf8'));
    } catch (err) {
      failed.push(`${file}: ${err.message}`);
    }
  }
  return failed;
};

describe('every shipped frontmatter parses', () => {
  test('skill files are found', () => {
    // Arrange
    const found = skillFiles('skills');
    // Act
    const count = found.length;
    // Assert
    assert.equal(count, 55, `found ${count} skill files`);
  });

  test('agent files are found', () => {
    // Arrange
    const found = agentFiles;
    // Act
    const count = found.length;
    // Assert
    assert.ok(count > 0, `found ${count} agent files`);
  });

  test('validate-skill parseFrontmatter accepts every skill and agent file', () => {
    // Arrange
    const parse = parseSkill;
    // Act
    const failed = failures(parse);
    // Assert
    assert.deepEqual(failed, [], failed.join('\n'));
  });

  test('check-agent parseFrontmatter accepts every skill and agent file', () => {
    // Arrange
    const parse = parseAgent;
    // Act
    const failed = failures(parse);
    // Assert
    assert.deepEqual(failed, [], failed.join('\n'));
  });
});
