import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'skills');
// The docs snapshot records Claude Code's own tool names, which a subagent never gets.
const DOC_FACTS = join('build-subagent', 'references', 'docs-snapshot.md');
const REMOVED = [/--no-plan/i, /EnterPlanMode/, /ExitPlanMode/, /plan mode/i, /Plan mode:/];

const hintOf = (content) => content.match(/^argument-hint:\s*(.*)$/m)?.[1] ?? '';

const filesUnder = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(dir, entry.name)) : [join(dir, entry.name)]
  );

describe('bypass flags', () => {
  const names = readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const name of names) {
    const content = readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf8');
    const body = content.replace(/^---\n[\s\S]*?\n---\n/, '');

    test(`${name} argument-hint has --yes`, () => {
      // Arrange
      const hint = hintOf(content);
      // Act
      const hasYes = hint.includes('--yes');
      // Assert
      assert.ok(hasYes, `argument-hint: ${hint}`);
    });

    test(`${name} body implements --yes`, () => {
      // Arrange
      const text = body;
      // Act
      const mentionsYes = text.includes('`--yes`');
      // Assert
      assert.ok(mentionsYes, 'body never mentions `--yes`');
    });

    test(`${name} has no plan mode or --no-plan`, () => {
      // Arrange
      const files = filesUnder(join(skillsDir, name)).filter(
        (file) => /\.(md|txt|ya?ml)$/.test(file) && !file.endsWith(DOC_FACTS)
      );
      // Act
      const hits = files.flatMap((file) => {
        const text = readFileSync(file, 'utf8');
        return REMOVED.filter((pattern) => pattern.test(text)).map((pattern) => `${file}: ${pattern}`);
      });
      // Assert
      assert.deepEqual(hits, []);
    });
  }
});
