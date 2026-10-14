import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  checkBody,
  checkFrontmatter,
  checkLayout,
  checkLinks,
  checkReferences,
  checkSkill,
  checkStandalone,
  FrontmatterError,
  main,
  parseArgs,
  parseFrontmatter
} from '../../../../../skills/build-skill/scripts/check-skill.mjs';

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
    const fields = { name: 'demo', description: 'a'.repeat(201), when_to_use: 'b'.repeat(1400) };
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
  const task = '## Output\n\n```text\nScope: x\nResult: done\n```\n';

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
    const body = '## Output\n\n```text\nScope: x\n```\n';
    // Act
    const found = checkBody(body, { kind: 'task' });
    // Assert
    assert.deepEqual(ids(found), ['output-result']);
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
  const run = (files, allow) => checkStandalone(Object.keys(files).sort(), '/d', makeDeps(files), allow);

  test('passes a link into an allowed directory', () => {
    // Arrange
    const files = { 'SKILL.md': '`${CLAUDE_SKILL_DIR}/../shared/references/x.md`' };
    // Act
    const found = run(files, ['skills/shared/']);
    // Assert
    assert.deepEqual(found, []);
  });

  test('passes an exact allowed file and a ${CLAUDE_PLUGIN_ROOT}/skills/ path under allow', () => {
    // Arrange
    const files = {
      'references/a.md': '[c](../../commit-changes/references/conventions.md)',
      'SKILL.md': '`${CLAUDE_PLUGIN_ROOT}/skills/shared/references/y.md`'
    };
    // Act
    const found = run(files, ['skills/commit-changes/references/conventions.md', 'skills/shared/']);
    // Assert
    assert.deepEqual(found, []);
  });

  test('errors on a link outside every allowed path', () => {
    // Arrange
    const files = { 'SKILL.md': '`${CLAUDE_SKILL_DIR}/../other/x.md`' };
    // Act
    const found = run(files, ['skills/shared/']);
    // Assert
    assert.deepEqual(
      found.map((f) => f.id),
      ['link-outside']
    );
  });

  test('errors on a sibling file next to an allowed file', () => {
    // Arrange
    const files = { 'SKILL.md': '`${CLAUDE_SKILL_DIR}/../commit-changes/references/other.md`' };
    // Act
    const found = run(files, ['skills/commit-changes/references/conventions.md']);
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
    assert.deepEqual(args, { dir: 'skills/x', kind: 'task', allow: [] });
  });

  test('parses a directory alone', () => {
    // Arrange
    const argv = ['skills/x'];
    // Act
    const args = parseArgs(argv);
    // Assert
    assert.deepEqual(args, { dir: 'skills/x', kind: undefined, allow: [] });
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

  test('collects each repeated --allow path', () => {
    // Arrange
    const argv = ['skills/x', '--allow', 'skills/shared/', '--allow', 'skills/a/references/b.md'];
    // Act
    const args = parseArgs(argv);
    // Assert
    assert.deepEqual(args.allow, ['skills/shared/', 'skills/a/references/b.md']);
  });

  test('parses --allow before the directory', () => {
    // Arrange
    const argv = ['--allow', 'skills/shared/', 'skills/x'];
    // Act
    const args = parseArgs(argv);
    // Assert
    assert.deepEqual(args, { dir: 'skills/x', kind: undefined, allow: ['skills/shared/'] });
  });

  test('rejects --allow without a path', () => {
    // Arrange
    const missing = ['skills/x', '--allow'];
    const flagNext = ['skills/x', '--allow', '--kind', 'task'];
    // Act
    const results = [parseArgs(missing), parseArgs(flagNext)];
    // Assert
    assert.deepEqual(results, [{ usage: true }, { usage: true }]);
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
