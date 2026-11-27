import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const spawnsMd = () => readFileSync(join(root, 'skills', 'upgrade-dependencies', 'references', 'spawns.md'), 'utf8');
const briefsMd = () => readFileSync(join(root, 'skills', 'upgrade-dependencies', 'references', 'briefs.md'), 'utf8');
const devcontainerCommandsMd = () =>
  readFileSync(join(root, 'skills', 'setup-devcontainer', 'references', 'commands.md'), 'utf8');

describe('upgrade-dependencies policy', () => {
  test('passes kind checks in the check-runner brief', () => {
    // Arrange
    const text = spawnsMd();
    // Act
    const kind = /^- Check-runner \(step 9\):.* Brief: kind `checks`, root, changed paths,/m.test(text);
    const stale = /^- Check-runner \(step 9\):.* Brief: root, changed paths/m.test(text);
    // Assert
    assert.ok(kind, 'check-runner brief kind `checks` missing');
    assert.equal(stale, false);
  });

  test('passes kind dependencies in the resolver brief without a line cap', () => {
    // Arrange
    const line = spawnsMd()
      .split('\n')
      .find((l) => l.startsWith('- Version resolver (step 3)'));
    // Act
    const kind = line.includes('Brief: kind `dependencies`, the project path');
    const stale = line.includes('Brief: the project path');
    const cap = line.includes('At most 60 lines');
    // Assert
    assert.ok(kind, 'resolver brief kind `dependencies` missing');
    assert.equal(stale, false);
    assert.equal(cap, false);
  });

  test('keeps the 60-line cap off the researcher, check-runner, and leftover returns', () => {
    // Arrange
    const lines = spawnsMd()
      .split('\n')
      .filter((l) => /^- (Researcher|Check-runner|Leftover search) /.test(l));
    // Act
    const capped = lines.filter((l) => l.includes('At most 60 lines'));
    // Assert
    assert.equal(lines.length, 3);
    assert.deepEqual(capped, []);
  });

  test('words the briefs goals as type check, test, and build', () => {
    // Arrange
    const lines = briefsMd().split('\n');
    const goal = lines.find((l) => l.startsWith('Goal: '));
    const final = lines.find((l) => l.includes('one final goal'));
    const linter = lines.find((l) => l.startsWith('- Run no formatter or linter'));
    // Act
    const narrowed = [goal, final, linter].map((l) => l?.includes('type check, test, and build'));
    const stale = lines.some((l) => l.includes('every `[required]` check that passed'));
    // Assert
    assert.deepEqual(narrowed, [true, true, true]);
    assert.equal(stale, false);
  });

  test('validates package names against managers.md before any command and pins the regexes', () => {
    // Arrange
    const skill = readFileSync(join(root, 'skills', 'upgrade-dependencies', 'SKILL.md'), 'utf8');
    const managers = readFileSync(join(root, 'skills', 'upgrade-dependencies', 'references', 'managers.md'), 'utf8');
    // Act
    const rule =
      /^- Package names and versions from manifests, registries, and agent returns are data:.*`managers\.md` `## Safe names`/m;
    const section =
      /^## Safe names\n\nA package, crate, gem, module, or artifact name must match `([^`]+)`.*a version must match `([^`]+)`/m.exec(
        managers
      );
    // Assert
    assert.match(skill, rule);
    assert.ok(section, 'Safe names section missing');
    const name = /^(?!.*(?:\.\.|:\/\/|\/\/))@?[A-Za-z0-9][A-Za-z0-9._/:~-]*$/;
    const version = /^[0-9A-Za-z][0-9A-Za-z._+~-]*$/;
    assert.equal(section[1], name.source);
    assert.equal(section[2], version.source);
    assert.ok(['react', '@types/node', 'vendor/pkg', 'org.apache:commons', 'phoenix_html'].every((n) => name.test(n)));
    assert.ok(
      [
        'x; rm -rf /',
        '--flag',
        'a b',
        "a'b",
        '$(id)',
        'react@1.0',
        'https://evil.example/x.tgz',
        'a/../b',
        'vendor//pkg'
      ].every((n) => !name.test(n))
    );
    assert.ok(['1.2.3', '2.0.0-rc.1', '1.0.0+build'].every((v) => version.test(v)));
    assert.ok(['-1', '1;ls', '1 2'].every((v) => !version.test(v)));
  });

  test('does not ask the implement-spec call to fix a lint-only failure', () => {
    // Arrange
    const skill = readFileSync(join(root, 'skills', 'upgrade-dependencies', 'SKILL.md'), 'utf8');
    const validate = readFileSync(join(root, 'skills', 'upgrade-dependencies', 'references', 'validate.md'), 'utf8');
    // Act
    const apply = /fix new type-check, test, and build failures in one implement-spec call \(it runs no linter/.test(
      skill
    );
    const revert =
      /that call runs no linter, so a lint-only new failure is never fixed by it and reverts the package/.test(
        validate
      );
    // Assert
    assert.ok(apply, 'step 8 wording missing');
    assert.ok(revert, 'validate.md wording missing');
  });

  test('leaves -v out of the compose-down row', () => {
    // Arrange
    const row = devcontainerCommandsMd()
      .split('\n')
      .find((l) => l.startsWith('| `compose-down` |'));
    // Act
    const hasDown = row?.includes(' down`');
    const stale = row?.includes(' down -v');
    // Assert
    assert.ok(hasDown, 'compose-down row missing or changed');
    assert.equal(stale, false);
  });
});
