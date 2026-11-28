import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'skills');
const read = (...parts) => readFileSync(join(skillsDir, ...parts), 'utf8');
const anchor = "the project's win, because the repo owner's rules are the source of truth";
const bullet =
  /^- Project rules: if the project you are running in \(the working directory's repo, not this plugin\) has instructions \(`CLAUDE\.md`, `AGENTS\.md`, `\.claude\/rules\/`\)/m;

describe('project rules clause', () => {
  const names = readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const name of names) {
    test(`${name} carries the Project rules bullet once, inside Rules`, () => {
      // Arrange
      const text = read(name, 'SKILL.md');
      const rules = text.match(/^## Rules\n([\s\S]*?)(?=^## )/m)?.[1] ?? '';
      // Act
      const found = [bullet.test(rules), rules.split(anchor).length - 1, text.split(anchor).length - 1];
      // Assert
      assert.deepEqual(found, [true, 1, 1]);
    });
  }

  test('no skill reference repeats the clause', () => {
    // Arrange
    const dupes = names.flatMap((name) =>
      readdirSync(join(skillsDir, name), { recursive: true })
        .filter((file) => file.endsWith('.md') && file !== 'SKILL.md')
        .filter((file) => read(name, file).includes(anchor))
        .map((file) => `${name}/${file}`)
    );
    // Act
    const found = dupes;
    // Assert
    assert.deepEqual(found, []);
  });

  test('the clause names no path of this plugin repo', () => {
    // Arrange
    const clause = read('build-skill', 'SKILL.md').match(/^- Project rules:.*$/m)?.[0] ?? '';
    // Act
    const found = /skills\/|agents\/|hooks\/|\.claude-plugin/.test(clause);
    // Assert
    assert.equal(found, false);
  });

  test('build-skill rules.md and the Spec brief require the clause', () => {
    // Arrange
    const rules = read('build-skill', 'references', 'rules.md');
    const briefs = read('build-skill', 'references', 'briefs.md');
    // Act
    const found = [
      /\*\*Project rules\*\*: a skill's Rules section carries one bullet/.test(rules),
      /\[P1\]/.test(rules),
      /Project rules:/.test(briefs)
    ];
    // Assert
    assert.deepEqual(found, [true, true, true]);
  });

  test('build-skill step 6 reads the project instructions before writing', () => {
    // Arrange
    const text = read('build-skill', 'SKILL.md');
    // Act
    const found = /the build reads the working directory's project instructions first/.test(text);
    // Assert
    assert.equal(found, true);
  });

  test('project instructions rank above skill defaults in CLAUDE.md, matching the skill bullet', () => {
    // Arrange
    const order = readFileSync(join(skillsDir, '..', '.claude', 'CLAUDE.md'), 'utf8').match(/^- Order:.*$/m)?.[0] ?? '';
    const clause = read('build-skill', 'SKILL.md').match(/^- Project rules:.*$/m)?.[0] ?? '';
    // Act
    const found = [
      order.includes('safety stops > project rules (path-scoped rule > this file > unconditional rules'),
      order.endsWith("> running `cdk` skill's defaults."),
      clause.includes(anchor),
      clause.includes("A project rule never lowers this skill's safety stops.")
    ];
    // Assert
    assert.deepEqual(found, [true, true, true, true]);
  });
});
