import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  checkBody,
  checkFrontmatter,
  checkLayout,
  checkLinks,
  checkReferences,
  checkSelfContained,
  checkSkill,
  checkSkillReferences,
  checkStandalone,
  FrontmatterError,
  main,
  parseArgs,
  parseFrontmatter
} from '../../../../../skills/build-skill/scripts/validate-skill.mjs';

const ids = (found) => found.map((f) => f.id);
const GOOD_FM = '---\nname: demo\ndescription: Does a thing. Use when asked.\n---\n';

// Stub deps over an in-memory skill: `files` maps a relative path to its content.
function makeDeps(files) {
  const out = { logs: [], errors: [] };
  return {
    out,
    list: () => Object.keys(files).sort(),
    read: (path) => {
      const key = Object.keys(files).find((k) => path.endsWith(`/${k}`));
      if (key === undefined) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      return files[key];
    },
    log: (line) => out.logs.push(line),
    error: (line) => out.errors.push(line)
  };
}

describe('parseFrontmatter', () => {
  test('parses scalars, quoted strings, and block lists', () => {
    // Arrange
    const text = "---\nname: demo\nargument-hint: '[x]'\npaths:\n  - a/**\n  - b\n---\nbody";
    // Act
    const { fields, endLine, lineOf } = parseFrontmatter(text);
    // Assert
    assert.deepEqual(fields, { name: 'demo', 'argument-hint': '[x]', paths: ['a/**', 'b'] });
    assert.equal(endLine, 7);
    assert.equal(lineOf.paths, 4);
  });

  test('joins an indented continuation onto a folded value', () => {
    // Arrange
    const text = '---\ndescription: >\n  one\n  two\n---\n';
    // Act
    const { fields } = parseFrontmatter(text);
    // Assert
    assert.equal(fields.description, 'one two');
  });

  test('throws when line 1 is not ---', () => {
    // Arrange
    const text = '\n---\nname: x\n---\n';
    // Act
    const act = () => parseFrontmatter(text);
    // Assert
    assert.throws(act, FrontmatterError);
  });

  test('throws when the closing --- is missing', () => {
    // Arrange
    const text = '---\nname: x\n';
    // Act
    const act = () => parseFrontmatter(text);
    // Assert
    assert.throws(act, /closing/);
  });
});

describe('checkFrontmatter', () => {
  test('passes a valid skill', () => {
    // Arrange
    const fields = { name: 'review-code', description: 'Reviews code. Use when asked.' };
    // Act
    const found = checkFrontmatter(fields, 'review-code');
    // Assert
    assert.deepEqual(found, []);
  });

  test('warns on an actor suffix without erroring', () => {
    // Arrange
    const fields = { name: 'code-reviewer', description: 'x' };
    // Act
    const found = checkFrontmatter(fields, 'code-reviewer');
    // Assert
    assert.deepEqual(
      found.map((f) => [f.id, f.level]),
      [['name-actor', 'warning']]
    );
  });

  test('skips the actor warning for a verb-first name', () => {
    // Arrange
    const fields = { name: 'setup-devcontainer', description: 'x' };
    // Act
    const found = checkFrontmatter(fields, 'setup-devcontainer');
    // Assert
    assert.deepEqual(found, []);
  });

  test('skips the actor warning for another verb-first name', () => {
    // Arrange
    const fields = { name: 'review-change-reviewer', description: 'x' };
    // Act
    const found = checkFrontmatter(fields, 'review-change-reviewer');
    // Assert
    assert.deepEqual(found, []);
  });

  test('still warns on an actor name whose first part is not a verb', () => {
    // Arrange
    const fields = { name: 'demo-runner', description: 'x' };
    // Act
    const found = checkFrontmatter(fields, 'demo-runner');
    // Assert
    assert.deepEqual(ids(found), ['name-actor']);
  });

  test('still warns on a single-word actor name', () => {
    // Arrange
    const fields = { name: 'scanner', description: 'x' };
    // Act
    const found = checkFrontmatter(fields, 'scanner');
    // Assert
    assert.deepEqual(ids(found), ['name-actor']);
  });

  test('errors on an unknown field', () => {
    // Arrange
    const fields = { name: 'demo', description: 'x', colour: 'red' };
    // Act
    const found = checkFrontmatter(fields, 'demo');
    // Assert
    assert.deepEqual(ids(found), ['unknown-field']);
  });

  test('errors on name format, directory mismatch, and reserved word', () => {
    // Arrange
    const fields = { name: 'My--claude', description: 'x' };
    // Act
    const found = checkFrontmatter(fields, 'other');
    // Assert
    assert.deepEqual(ids(found).sort(), ['name-dir', 'name-format', 'name-reserved']);
  });

  test('errors on description over 200 chars and combined over 1,536', () => {
    // Arrange
    const fields = {
      name: 'demo',
      description: 'a'.repeat(201),
      when_to_use: 'b'.repeat(1400),
      compatibility: 'Claude Code only'
    };
    // Act
    const found = checkFrontmatter(fields, 'demo');
    // Assert
    assert.deepEqual(ids(found), ['description-length', 'listing-length']);
  });

  test('allows a description of exactly 200 chars', () => {
    // Arrange
    const fields = { name: 'demo', description: 'a'.repeat(200) };
    // Act
    const found = checkFrontmatter(fields, 'demo');
    // Assert
    assert.deepEqual(ids(found), []);
  });

  test('errors on a plugin-qualified name or a spawned-by phrase in the description', () => {
    // Arrange
    const qualified = { name: 'demo', description: 'Runs after cdk:update-changelog.' };
    const spawned = { name: 'demo', description: 'Spawned by the build skill.' };
    // Act
    const a = checkFrontmatter(qualified, 'demo');
    const b = checkFrontmatter(spawned, 'demo');
    // Assert
    assert.deepEqual(ids(a), ['description-reference']);
    assert.deepEqual(ids(b), ['description-reference']);
  });

  test('allows plain colons and generic words in the description', () => {
    // Arrange
    const colon = { name: 'demo', description: 'Formats files: JSON, YAML. Use when chained.' };
    const time = { name: 'demo', description: 'Runs at 10:30 and needs a skill.' };
    // Act
    const a = checkFrontmatter(colon, 'demo');
    const b = checkFrontmatter(time, 'demo');
    // Assert
    assert.deepEqual(ids(a), []);
    assert.deepEqual(ids(b), []);
  });

  test('errors on an XML tag in the description and a missing name', () => {
    // Arrange
    const fields = { description: 'uses <b>bold</b>' };
    // Act
    const found = checkFrontmatter(fields, 'demo');
    // Assert
    assert.deepEqual(ids(found), ['name-missing', 'description-xml']);
  });
});

describe('checkBody', () => {
  const task = '## Output\n\n```text\nScope: x\nNext: /cdk:y | none\nResult: done\n```\n';

  test('passes a task body with a Result line and a Files section', () => {
    // Arrange
    const body = `# T\n\n## Files\n\n${task}`;
    // Act
    const found = checkBody(body, { kind: 'task', hasBundled: true });
    // Assert
    assert.deepEqual(found, []);
  });

  test('accepts an injection with a fallback and quoted syntax in a double-backtick span', () => {
    // Arrange
    const body = "- Branch: !`git branch || echo '<none>'`\nWrite `` !`cmd` `` to inject.\n";
    // Act
    const found = checkBody(body);
    // Assert
    assert.deepEqual(found, []);
  });

  test('errors when SKILL.md reaches 500 lines', () => {
    // Arrange
    const body = `${'x\n'.repeat(500)}`;
    // Act
    const found = checkBody(body);
    // Assert
    assert.deepEqual(ids(found), ['skill-too-long']);
  });

  test('errors on an inline injection and a ```! block without a fallback', () => {
    // Arrange
    const body = '- A: !`git status`\n```!\ngit log\n```\n';
    // Act
    const found = checkBody(body);
    // Assert
    assert.deepEqual(ids(found), ['injection-fallback', 'injection-fallback']);
  });

  test('errors when bundled files exist but no navigation section does', () => {
    // Arrange
    const body = '# T\n\n## Rules\n';
    // Act
    const found = checkBody(body, { hasBundled: true });
    // Assert
    assert.deepEqual(ids(found), ['navigation-missing']);
  });

  test('errors when a task Output has no Result line', () => {
    // Arrange
    const body = '## Output\n\n```text\nScope: x\nNext: none\n```\n';
    // Act
    const found = checkBody(body, { kind: 'task' });
    // Assert
    assert.deepEqual(ids(found), ['output-result']);
  });

  test('warns spawn-builtin when a body spawns Explore or general-purpose', () => {
    // Arrange
    const bad = 'Spawn one Explore agent.\nDelegate to general-purpose.\n';
    const ok = 'Spawn `cdk:task-worker`, never `Explore` or `general-purpose`.\nExplored 3 files.\n';
    // Act
    const found = [...checkBody(bad, { kind: 'task' }), ...checkBody(ok, { kind: 'task' })];
    // Assert
    assert.deepEqual(
      found.filter((f) => f.id === 'spawn-builtin').map((f) => f.line),
      [1, 2]
    );
  });

  test('does not warn spawn-builtin for a lowercase "explore"', () => {
    // Arrange
    const body = 'Spawn `cdk:task-worker` to explore the module.\n';
    // Act
    const found = checkBody(body, { kind: 'task' });
    // Assert
    assert.deepEqual(
      found.filter((f) => f.id === 'spawn-builtin'),
      []
    );
  });

  test('warns spawn-builtin for a lowercase verb before Explore', () => {
    // Arrange
    const body = 'Then spawn an Explore agent.\n';
    // Act
    const found = checkBody(body, { kind: 'task' });
    // Assert
    assert.deepEqual(
      found.filter((f) => f.id === 'spawn-builtin').map((f) => f.line),
      [1]
    );
  });

  test('warns spawn-builtin for spawned, delegates, delegated, delegating', () => {
    // Arrange
    const body =
      'Spawned an Explore agent.\nDelegates to general-purpose.\nDelegated to Explore.\nDelegating to general-purpose.\n';
    // Act
    const found = checkBody(body, { kind: 'task' });
    // Assert
    assert.deepEqual(
      found.filter((f) => f.id === 'spawn-builtin').map((f) => f.line),
      [1, 2, 3, 4]
    );
  });

  test('warns output-next when a task Output has no Next line', () => {
    // Arrange
    const body = '## Output\n\n```text\nScope: x\nResult: done\n```\n';
    const outside = '## Output\n\n```text\nResult: done\n```\n\n## Notes\n\nNext: later\n';
    // Act
    const found = [...checkBody(body, { kind: 'task' }), ...checkBody(outside, { kind: 'task' })];
    // Assert
    assert.deepEqual(ids(found), ['output-next', 'output-next']);
  });

  test('accepts a Next line before Result and one with a slash command', () => {
    // Arrange
    const plain = '## Output\n\n```text\nNext: none\nResult: done\n```\n';
    const chained = '## Output\n\n```text\nNext: /cdk:commit-changes | none\nResult: done\n```\n';
    // Act
    const found = [...checkBody(plain, { kind: 'task' }), ...checkBody(chained, { kind: 'task' })];
    // Assert
    assert.deepEqual(found, []);
  });

  test('skips the Output check for a reference skill', () => {
    // Arrange
    const body = '# R\n';
    // Act
    const found = checkBody(body, { kind: 'reference' });
    // Assert
    assert.deepEqual(found, []);
  });
});

describe('checkLayout', () => {
  test('passes SKILL.md plus the three allowed directories', () => {
    // Arrange
    const files = ['SKILL.md', 'assets/a.md', 'references/r.md', 'scripts/s.mjs'];
    // Act
    const found = checkLayout(files);
    // Assert
    assert.deepEqual(found, []);
  });

  test('passes a lone SKILL.md', () => {
    // Arrange
    const files = ['SKILL.md'];
    // Act
    const found = checkLayout(files);
    // Assert
    assert.deepEqual(found, []);
  });

  test('errors on a stray top-level file and an unknown directory', () => {
    // Arrange
    const files = ['SKILL.md', 'README.md', 'docs/a.md'];
    // Act
    const found = checkLayout(files);
    // Assert
    assert.deepEqual(
      found.map((f) => f.file),
      ['README.md', 'docs/a.md']
    );
  });

  test('errors on a top-level dotfile', () => {
    // Arrange
    const files = ['SKILL.md', '.env'];
    // Act
    const found = checkLayout(files);
    // Assert
    assert.deepEqual(ids(found), ['dotfile']);
    assert.equal(found[0].file, '.env');
  });

  test('errors on a dot-directory', () => {
    // Arrange
    const files = ['SKILL.md', '.git/config'];
    // Act
    const found = checkLayout(files);
    // Assert
    assert.deepEqual(ids(found), ['dotfile']);
    assert.equal(found[0].file, '.git/config');
  });

  test('errors on a dotfile nested in references', () => {
    // Arrange
    const files = ['SKILL.md', 'references/.secret.md', 'references/r.md'];
    // Act
    const found = checkLayout(files);
    // Assert
    assert.deepEqual(
      found.map((f) => f.file),
      ['references/.secret.md']
    );
  });

  test('errors when SKILL.md is missing', () => {
    // Arrange
    const files = ['references/r.md'];
    // Act
    const found = checkLayout(files);
    // Assert
    assert.deepEqual(ids(found), ['skill-missing']);
  });
});

describe('checkLinks', () => {
  test('passes when every link resolves and every file is linked', () => {
    // Arrange
    const md = 'See `${CLAUDE_SKILL_DIR}/references/a.md` and ${CLAUDE_SKILL_DIR}/scripts/.';
    const files = ['SKILL.md', 'references/a.md', 'scripts/s.mjs'];
    // Act
    const found = checkLinks(md, files);
    // Assert
    assert.deepEqual(found, []);
  });

  test('skips, without reporting, a link that leaves the skill directory', () => {
    // Arrange
    const md = '`${CLAUDE_SKILL_DIR}/../x/y.md`';
    // Act
    const found = checkLinks(md, ['SKILL.md']);
    // Assert
    assert.deepEqual(found, []);
  });

  test('errors on a broken link', () => {
    // Arrange
    const md = '`${CLAUDE_SKILL_DIR}/references/gone.md`';
    // Act
    const found = checkLinks(md, ['SKILL.md']);
    // Assert
    assert.deepEqual(ids(found), ['link-broken']);
  });

  test('errors on an orphaned bundled file', () => {
    // Arrange
    const files = ['SKILL.md', 'assets/lonely.md'];
    // Act
    const found = checkLinks('no links', files);
    // Assert
    assert.deepEqual(
      found.map((f) => [f.id, f.file]),
      [['orphan', 'assets/lonely.md']]
    );
  });
});

describe('checkStandalone', () => {
  const run = (files) => checkStandalone(Object.keys(files).sort(), '/d', makeDeps(files));

  test('errors on a link into another skill', () => {
    // Arrange
    const files = { 'SKILL.md': '`${CLAUDE_SKILL_DIR}/../other/x.md`' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(
      found.map((f) => f.id),
      ['link-outside']
    );
  });

  test('errors on a ${CLAUDE_PLUGIN_ROOT}/skills/ path', () => {
    // Arrange
    const files = { 'SKILL.md': '`${CLAUDE_PLUGIN_ROOT}/skills/shared/references/y.md`' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(
      found.map((f) => f.id),
      ['link-outside']
    );
  });

  test('passes an in-skill ../ link from references/', () => {
    // Arrange
    const files = {
      'SKILL.md': 'x',
      'references/a.md': 'See [t](../assets/x.md) and `../assets/x.md`.',
      'assets/x.md': ''
    };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(found, []);
  });

  test('passes a plain ${CLAUDE_SKILL_DIR} path and an in-skill script import', () => {
    // Arrange
    const files = {
      'SKILL.md': '`${CLAUDE_SKILL_DIR}/references/x.md`',
      'scripts/a.mjs': "import { b } from './b.mjs';\nimport fs from 'node:fs';"
    };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(found, []);
  });

  test('errors on a ${CLAUDE_SKILL_DIR}/../ path in SKILL.md', () => {
    // Arrange
    const files = { 'SKILL.md': '`${CLAUDE_SKILL_DIR}/../shared/x.md`' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(
      found.map((f) => [f.id, f.level, f.file, f.line]),
      [['link-outside', 'error', 'SKILL.md', 1]]
    );
  });

  test('errors on a ../../ link in a reference', () => {
    // Arrange
    const files = { 'references/a.md': 'ok\n[x](../../other/x.md)' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(
      found.map((f) => [f.id, f.line]),
      [['link-outside', 2]]
    );
  });

  test('errors on a ${CLAUDE_PLUGIN_ROOT}/skills/ path', () => {
    // Arrange
    const files = { 'SKILL.md': '`${CLAUDE_PLUGIN_ROOT}/skills/x/SKILL.md`' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(ids(found), ['link-outside']);
  });

  test('errors on a script import that leaves the skill root', () => {
    // Arrange
    const files = { 'scripts/a.mjs': "import { x } from '../../../hooks/x.mjs';" };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(ids(found), ['link-outside']);
  });
});

describe('checkSkillReferences', () => {
  const run = (files, name = 'demo') => checkSkillReferences(Object.keys(files).sort(), '/d', name, makeDeps(files));

  test('errors on the Skill tool', () => {
    // Arrange
    const files = { 'SKILL.md': 'Step 1: use the Skill tool to lint.' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(ids(found), ['skill-reference']);
  });

  test('errors on a qualified slash command in a reference', () => {
    // Arrange
    const files = { 'SKILL.md': 'x', 'references/a.md': 'Then `/plugin:other` runs.' };
    // Act
    const found = run(files);
    // Assert
    assert.equal(found[0].file, 'references/a.md');
    assert.equal(found[0].line, 1);
  });

  test('errors on ${CLAUDE_PLUGIN_ROOT}', () => {
    // Arrange
    const files = { 'SKILL.md': 'Read `${CLAUDE_PLUGIN_ROOT}/x`.' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(ids(found), ['skill-reference']);
  });

  test('errors on a bare slash command after run', () => {
    // Arrange
    const files = { 'SKILL.md': 'First run /lint-code.' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(ids(found), ['skill-reference']);
  });

  test('allows a line with never', () => {
    // Arrange
    const files = { 'SKILL.md': 'Never invoke /plugin:other or the Skill tool.' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(found, []);
  });

  test("allows the skill's own name", () => {
    // Arrange
    const files = { 'SKILL.md': 'Invoked as /cdk:demo or run /demo.' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(found, []);
  });

  test('allows a fenced example', () => {
    // Arrange
    const files = { 'SKILL.md': '```text\nrun /plugin:other\n```' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(found, []);
  });

  test('allows plain qualified text without a slash', () => {
    // Arrange
    const files = { 'SKILL.md': 'Spawn cdk:agent-name for it.' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(found, []);
  });
});

describe('checkReferences', () => {
  test('passes a short reference and a long one that opens with a contents list', () => {
    // Arrange
    const long = `# L\n\n## Contents\n\n${'x\n'.repeat(120)}`;
    const deps = makeDeps({ 'references/s.md': '# S\n', 'references/l.md': long });
    // Act
    const found = checkReferences(['references/l.md', 'references/s.md'], '/d', deps);
    // Assert
    assert.deepEqual(found, []);
  });

  test('ignores non-reference files', () => {
    // Arrange
    const deps = makeDeps({ 'assets/t.md': '!`git status`\n' });
    // Act
    const found = checkReferences(['assets/t.md'], '/d', deps);
    // Assert
    assert.deepEqual(found, []);
  });

  test('errors on a long reference without a contents list', () => {
    // Arrange
    const deps = makeDeps({ 'references/l.md': `# L\n${'x\n'.repeat(120)}` });
    // Act
    const found = checkReferences(['references/l.md'], '/d', deps);
    // Assert
    assert.deepEqual(ids(found), ['contents-missing']);
  });

  test('errors on an injection inside references/', () => {
    // Arrange
    const deps = makeDeps({ 'references/i.md': "- A: !`git status || echo '<none>'`\n" });
    // Act
    const found = checkReferences(['references/i.md'], '/d', deps);
    // Assert
    assert.deepEqual(ids(found), ['injection-in-reference']);
  });
});

describe('checkSkill', () => {
  test('returns ok for a valid skill', () => {
    // Arrange
    const deps = makeDeps({ 'SKILL.md': `${GOOD_FM}# Demo\n` });
    // Act
    const result = checkSkill('/x/demo', {}, deps);
    // Assert
    assert.deepEqual(result, { ok: true, errors: [], warnings: [] });
  });

  test('reports warnings without failing', () => {
    // Arrange
    const deps = makeDeps({ 'SKILL.md': '---\nname: demo-runner\ndescription: x\n---\n' });
    // Act
    const result = checkSkill('/x/demo-runner', {}, deps);
    // Assert
    assert.deepEqual([result.ok, ids(result.warnings)], [true, ['name-actor']]);
  });

  test('reports a malformed frontmatter as F6', () => {
    // Arrange
    const deps = makeDeps({ 'SKILL.md': '# no frontmatter\n' });
    // Act
    const result = checkSkill('/x/demo', {}, deps);
    // Assert
    assert.deepEqual([result.ok, ids(result.errors)], [false, ['frontmatter-malformed']]);
  });

  test('reports a missing SKILL.md and rethrows unexpected read errors', () => {
    // Arrange
    const missing = makeDeps({ 'references/a.md': '# A\n' });
    const broken = {
      ...makeDeps({ 'SKILL.md': GOOD_FM }),
      read: () => {
        throw Object.assign(new Error('denied'), { code: 'EACCES' });
      }
    };
    // Act
    const result = checkSkill('/x/demo', {}, missing);
    // Assert
    assert.ok(ids(result.errors).includes('skill-missing'));
    assert.throws(() => checkSkill('/x/demo', {}, broken), /denied/);
  });
});

describe('parseArgs', () => {
  test('parses a directory and a kind', () => {
    // Arrange
    const argv = ['skills/x', '--kind', 'task'];
    // Act
    const args = parseArgs(argv);
    // Assert
    assert.deepEqual(args, { dir: 'skills/x', kind: 'task' });
  });

  test('parses a directory alone', () => {
    // Arrange
    const argv = ['skills/x'];
    // Act
    const args = parseArgs(argv);
    // Assert
    assert.deepEqual(args, { dir: 'skills/x', kind: undefined });
  });

  test('rejects no directory and an unknown kind', () => {
    // Arrange
    const none = [];
    const bad = ['x', '--kind', 'weird'];
    // Act
    const results = [parseArgs(none), parseArgs(bad)];
    // Assert
    assert.deepEqual(results, [{ usage: true }, { usage: true }]);
  });

  test('rejects the removed --allow flag', () => {
    // Arrange
    const argv = ['skills/x', '--allow', 'skills/shared/'];
    // Act
    const args = parseArgs(argv);
    // Assert
    assert.deepEqual(args, { usage: true });
  });
});

describe('main', () => {
  test('prints JSON and returns 0 for a valid skill', () => {
    // Arrange
    const deps = makeDeps({ 'SKILL.md': `${GOOD_FM}# Demo\n` });
    // Act
    const code = main(['/x/demo'], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(deps.out.logs[0]).ok, true);
  });

  test('returns 1 when errors are found', () => {
    // Arrange
    const deps = makeDeps({ 'SKILL.md': '---\nname: other\ndescription: x\n---\n' });
    // Act
    const code = main(['/x/demo'], deps);
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(deps.out.logs[0]).errors[0].id, 'name-dir');
  });

  test('returns 2 with a usage line on bad arguments', () => {
    // Arrange
    const deps = makeDeps({});
    // Act
    const code = main([], deps);
    // Assert
    assert.equal(code, 2);
    assert.match(deps.out.errors[0], /usage/);
  });

  test('returns 2 when the directory does not exist and rethrows other errors', () => {
    // Arrange
    const gone = {
      ...makeDeps({}),
      list: () => {
        throw Object.assign(new Error('nope'), { code: 'ENOENT' });
      }
    };
    const broken = {
      ...makeDeps({}),
      list: () => {
        throw new Error('boom');
      }
    };
    // Act
    const code = main(['/x/missing'], gone);
    // Assert
    assert.equal(code, 2);
    assert.throws(() => main(['/x/y'], broken), /boom/);
  });
});

describe('new frontmatter checks', () => {
  const base = { name: 'demo', description: 'Does a thing. Use when asked.' };
  const CC = 'Claude Code only. Uploads to claude.ai and the API reject unknown keys.';

  test('description-person: passes third person', () => {
    // Arrange
    const fields = { ...base };
    // Act
    const found = checkFrontmatter(fields, 'demo');
    // Assert
    assert.equal(ids(found).includes('description-person'), false);
  });

  test('description-person: passes "I/O" and "web" words', () => {
    // Arrange
    const fields = { ...base, description: 'Checks I/O on web assets. Use when asked.' };
    // Act
    const found = checkFrontmatter(fields, 'demo');
    // Assert
    assert.equal(ids(found).includes('description-person'), false);
  });

  test('description-person: errors on "you" and on a leading "I"', () => {
    // Arrange
    const second = { ...base, description: 'Use this when you want a fix.' };
    const first = { ...base, description: 'I help with commits. Use when asked.' };
    // Act
    const results = [checkFrontmatter(second, 'demo'), checkFrontmatter(first, 'demo')].map(ids);
    // Assert
    assert.ok(results.every((r) => r.includes('description-person')));
  });

  test('compat-missing: passes portable keys and a marked Claude Code key', () => {
    // Arrange
    const portable = { ...base, 'allowed-tools': 'Read' };
    const marked = { ...base, 'disable-model-invocation': 'true', compatibility: CC };
    // Act
    const results = [checkFrontmatter(portable, 'demo'), checkFrontmatter(marked, 'demo')].map(ids);
    // Assert
    assert.ok(results.every((r) => !r.includes('compat-missing')));
  });

  test('compat-missing: errors without compatibility or with one that omits Claude Code', () => {
    // Arrange
    const none = { ...base, 'argument-hint': '[x]' };
    const vague = { ...base, 'argument-hint': '[x]', compatibility: 'Needs git.' };
    // Act
    const results = [checkFrontmatter(none, 'demo'), checkFrontmatter(vague, 'demo')].map(ids);
    // Assert
    assert.ok(results.every((r) => r.includes('compat-missing')));
  });

  test('fork-background: passes with background set or without fork', () => {
    // Arrange
    const set = { ...base, compatibility: CC, context: 'fork', background: 'false' };
    const none = { ...base, compatibility: CC, 'user-invocable': 'false' };
    // Act
    const results = [checkFrontmatter(set, 'demo'), checkFrontmatter(none, 'demo')].map(ids);
    // Assert
    assert.ok(results.every((r) => !r.includes('fork-background')));
  });

  test('fork-background: warns on context: fork without background', () => {
    // Arrange
    const fields = { ...base, compatibility: CC, context: 'fork' };
    // Act
    const found = checkFrontmatter(fields, 'demo').filter((f) => f.id === 'fork-background');
    // Assert
    assert.deepEqual(
      found.map((f) => f.level),
      ['warning']
    );
  });

  test('agent-without-fork: passes with fork', () => {
    // Arrange
    const fields = { ...base, compatibility: CC, context: 'fork', background: 'false', agent: 'reviewer' };
    // Act
    const found = checkFrontmatter(fields, 'demo');
    // Assert
    assert.equal(ids(found).includes('agent-without-fork'), false);
  });

  test('agent-without-fork: errors when context is absent', () => {
    // Arrange
    const fields = { ...base, compatibility: CC, agent: 'reviewer' };
    // Act
    const found = checkFrontmatter(fields, 'demo');
    // Assert
    assert.ok(ids(found).includes('agent-without-fork'));
  });

  test('side-effect-invocation: passes read-only tools and a flagged skill', () => {
    // Arrange
    const readOnly = { ...base, 'allowed-tools': 'Read Glob Grep' };
    const flagged = {
      ...base,
      compatibility: CC,
      'disable-model-invocation': 'true',
      'allowed-tools': 'Write Bash(node x.mjs *)'
    };
    // Act
    const results = [checkFrontmatter(readOnly, 'demo'), checkFrontmatter(flagged, 'demo')].map(ids);
    // Assert
    assert.ok(results.every((r) => !r.includes('side-effect-invocation')));
  });

  test('side-effect-invocation: warns on Write, Edit, or a scoped Bash without the flag', () => {
    // Arrange
    const write = { ...base, 'allowed-tools': 'Read Write' };
    const bash = { ...base, 'allowed-tools': 'Bash(git status *), Read' };
    // Act
    const results = [checkFrontmatter(write, 'demo'), checkFrontmatter(bash, 'demo')];
    // Assert
    assert.ok(results.every((r) => r.some((f) => f.id === 'side-effect-invocation' && f.level === 'warning')));
  });
});

describe('checkSelfContained', () => {
  const run = (files) => checkSelfContained(Object.keys(files).sort(), '/d', makeDeps(files));

  test('reserved-folder: passes normal folders, errors on synced and anthropic-skills', () => {
    // Arrange
    const good = { 'SKILL.md': 'x', 'references/a.md': 'x' };
    const bad = { 'SKILL.md': 'x', 'references/synced/a.md': 'x', 'assets/anthropic-skills/b.md': 'x' };
    // Act
    const results = [run(good), run(bad)];
    // Assert
    assert.deepEqual(results[0], []);
    assert.deepEqual(
      results[1].map((f) => f.id),
      ['reserved-folder', 'reserved-folder']
    );
  });

  test('path-parent: passes a skill-dir link, errors on a bare ../ path', () => {
    // Arrange
    const good = { 'SKILL.md': 'See `${CLAUDE_SKILL_DIR}/references/a.md`.' };
    const bad = { 'SKILL.md': 'See [x](../other/a.md).' };
    // Act
    const results = [run(good), run(bad)];
    // Assert
    assert.deepEqual(results[0], []);
    assert.deepEqual(
      results[1].map((f) => f.id),
      ['path-parent']
    );
  });

  test('path-absolute: allows ~/.claude/ scope paths, errors on /Users, /home, ~/ and C:\\', () => {
    // Arrange
    const good = { 'SKILL.md': 'User scope is ~/.claude/skills/x/.' };
    const bad = { 'SKILL.md': 'a /Users/me/x\nb `/home/me/y`\nc ~/notes\nd C:\\dir' };
    // Act
    const results = [run(good), run(bad)];
    // Assert
    assert.deepEqual(results[0], []);
    assert.equal(results[1].filter((f) => f.id === 'path-absolute').length, 4);
  });

  test('path-backslash: passes forward slashes, errors on references\\x.md', () => {
    // Arrange
    const good = { 'SKILL.md': 'Read references/x.md' };
    const bad = { 'SKILL.md': 'Read references\\x.md' };
    // Act
    const results = [run(good), run(bad)];
    // Assert
    assert.deepEqual(results[0], []);
    assert.deepEqual(
      results[1].map((f) => f.id),
      ['path-backslash']
    );
  });

  test('nested-reference: passes a reference that links nothing or an unbundled name', () => {
    // Arrange
    const files = { 'SKILL.md': 'x', 'references/a.md': 'See notes.md and README.md.', 'references/b.md': 'x' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(found, []);
  });

  test('nested-reference: errors on a path, a skill-dir path, and a markdown link to a bundled file', () => {
    // Arrange
    const files = {
      'SKILL.md': 'x',
      'references/a.md': 'See references/b.md.\nSee `${CLAUDE_SKILL_DIR}/references/b.md`.\nSee [b](b.md).',
      'references/b.md': 'x'
    };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(
      found.map((f) => f.id),
      ['nested-reference', 'nested-reference', 'nested-reference']
    );
  });

  test('nested-reference: SKILL.md may link references', () => {
    // Arrange
    const files = { 'SKILL.md': 'See `${CLAUDE_SKILL_DIR}/references/b.md`.', 'references/b.md': 'x' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(found, []);
  });

  test('time-sensitive: passes timeless text, warns on "currently" and dated phrases', () => {
    // Arrange
    const good = { 'SKILL.md': 'Use the latest stable release.' };
    const bad = { 'SKILL.md': 'This is currently beta.\nAs of March the API changed.\nSupported until 2027.' };
    // Act
    const results = [run(good), run(bad)];
    // Assert
    assert.deepEqual(results[0], []);
    assert.deepEqual(
      results[1].map((f) => [f.id, f.level]),
      Array(3).fill(['time-sensitive', 'warning'])
    );
  });

  test('time-sensitive: warns on an ISO date in prose', () => {
    // Arrange
    const files = { 'SKILL.md': 'The snapshot was taken 2026-10-24 on this machine.' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(
      found.map((f) => [f.id, f.rule, f.level]),
      [['time-sensitive', 'B11', 'warning']]
    );
  });

  test('time-sensitive: warns on an ISO date in a bullet', () => {
    // Arrange
    const files = { 'SKILL.md': '- Released 2025-01-31 with breaking changes.' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(
      found.map((f) => [f.id, f.level]),
      [['time-sensitive', 'warning']]
    );
  });

  test('time-sensitive: passes an ISO date on a Fetched: line', () => {
    // Arrange
    const files = { 'SKILL.md': 'Fetched: 2026-10-24 (local version 2.1.310)' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(found, []);
  });

  test('time-sensitive: passes an ISO date inside a code fence', () => {
    // Arrange
    const files = { 'SKILL.md': '```text\n## [1.0.0] - 2026-10-24\n```' };
    // Act
    const found = run(files);
    // Assert
    assert.deepEqual(found, []);
  });
});
