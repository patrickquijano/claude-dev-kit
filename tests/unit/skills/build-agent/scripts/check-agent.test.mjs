import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  checkAgent,
  checkBody,
  checkFrontmatter,
  FrontmatterError,
  main,
  parseArgs,
  parseFrontmatter
} from '../../../../../skills/build-agent/scripts/check-agent.mjs';

const ids = (found) => found.map((f) => f.id);
const BODY = 'Read-only reviewer.\n\n## Task\n\n1. Read the inputs.\n\n## Return\n\n```text\nScore: 1\n```\n';
const GOOD = `---\nname: demo\ndescription: Use proactively to review things.\ntools: Read, Grep\n---\n\n${BODY}`;

function makeDeps(content) {
  const out = { logs: [], errors: [] };
  return {
    out,
    read: () => {
      if (content === null) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      return content;
    },
    log: (line) => out.logs.push(line),
    error: (line) => out.errors.push(line)
  };
}

describe('parseFrontmatter', () => {
  test('parses scalars, quoted strings, and block lists', () => {
    // Arrange
    const text = '---\nname: demo\ndescription: "Hi: there"\nskills:\n  - a\n  - b\n---\nbody';
    // Act
    const { fields, lineOf, endLine } = parseFrontmatter(text);
    // Assert
    assert.deepEqual(fields, { name: 'demo', description: 'Hi: there', skills: ['a', 'b'] });
    assert.equal(lineOf.skills, 4);
    assert.equal(endLine, 7);
  });

  test('keeps nested keys under their parent', () => {
    // Arrange
    const text = '---\nname: x\nexperimental:\n  cacheTtl: 1h\n---\n';
    // Act
    const { fields } = parseFrontmatter(text);
    // Assert
    assert.equal(fields.experimental, 'cacheTtl: 1h');
  });

  test('throws when the opening --- is not on line 1', () => {
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

  test('throws on a line that is not YAML', () => {
    // Arrange
    const text = '---\nname: x\n!!! junk\n---\n';
    // Act
    const act = () => parseFrontmatter(text);
    // Assert
    assert.throws(act, /not valid/);
  });
});

describe('checkFrontmatter', () => {
  test('returns nothing for a valid agent', () => {
    // Arrange
    const fields = { name: 'demo', description: 'Use proactively to do x.', tools: 'Read, Grep', model: 'haiku' };
    // Act
    const found = checkFrontmatter(fields, 'demo');
    // Assert
    assert.deepEqual(found, []);
  });

  test('accepts a full model id and camelCase fields', () => {
    // Arrange
    const fields = {
      name: 'demo',
      description: 'Use proactively.',
      model: 'claude-sonnet-5-5',
      maxTurns: '5',
      omitClaudeMd: 'true'
    };
    // Act
    const found = checkFrontmatter(fields, 'demo');
    // Assert
    assert.deepEqual(found, []);
  });

  test('flags an unknown field', () => {
    // Arrange
    const fields = { name: 'demo', description: 'Use proactively.', max_turns: '3' };
    // Act
    const found = checkFrontmatter(fields, 'demo', { max_turns: 4 });
    // Assert
    assert.deepEqual(ids(found), ['unknown-field']);
    assert.equal(found[0].line, 4);
  });

  test('flags a missing name and a missing description', () => {
    // Arrange
    const fields = {};
    // Act
    const found = checkFrontmatter(fields, 'demo');
    // Assert
    assert.deepEqual(ids(found), ['name-missing', 'description-missing']);
  });

  test('flags a description over 200 chars', () => {
    // Arrange
    const fields = { name: 'demo', description: `Use proactively ${'a'.repeat(190)}` };
    // Act
    const found = checkFrontmatter(fields, 'demo');
    // Assert
    assert.deepEqual(ids(found), ['description-length']);
    assert.equal(
      checkFrontmatter({ name: 'demo', description: `Use proactively ${'a'.repeat(184)}` }, 'demo').length,
      0
    );
  });

  test('flags a description without "Use proactively"', () => {
    // Arrange
    const fields = { name: 'demo', description: 'Reviews things when asked.' };
    // Act
    const found = checkFrontmatter(fields, 'demo');
    // Assert
    assert.deepEqual(ids(found), ['description-proactive']);
    assert.deepEqual(ids(checkFrontmatter({ name: 'demo', description: 'USE PROACTIVELY to review.' }, 'demo')), []);
  });

  test('flags a plugin-qualified name or a spawned-by phrase in the description', () => {
    // Arrange
    const qualified = { name: 'demo', description: 'Use proactively after cdk:build-readme.' };
    const spawned = { name: 'demo', description: 'Use proactively. Spawned by a skill.' };
    // Act
    const a = checkFrontmatter(qualified, 'demo');
    const b = checkFrontmatter(spawned, 'demo');
    // Assert
    assert.deepEqual(ids(a), ['description-reference']);
    assert.deepEqual(ids(b), ['description-reference']);
  });

  test('allows a plain colon and generic words in the description', () => {
    // Arrange
    const fields = { name: 'demo', description: 'Use proactively at 10:30 to check: a skill file.' };
    // Act
    const found = checkFrontmatter(fields, 'demo');
    // Assert
    assert.deepEqual(ids(found), []);
  });

  test('flags a colon, a leading hyphen, and an overlong name', () => {
    // Arrange
    const fields = { name: `-a:${'b'.repeat(260)}`, description: 'Use proactively.' };
    // Act
    const found = checkFrontmatter(fields, 'x');
    // Assert
    assert.deepEqual(ids(found), ['name-colon', 'name-hyphen', 'name-length', 'name-stem']);
  });

  test('warns when name differs from the file name', () => {
    // Arrange
    const fields = { name: 'a', description: 'Use proactively.' };
    // Act
    const found = checkFrontmatter(fields, 'b');
    // Assert
    assert.deepEqual(ids(found), ['name-stem']);
    assert.equal(found[0].level, 'warning');
  });

  test('flags invalid enums, booleans, maxTurns, and a bad model', () => {
    // Arrange
    const fields = {
      name: 'a',
      description: 'Use proactively.',
      effort: 'ultra',
      color: 'teal',
      background: 'yes',
      maxTurns: '0',
      model: 'bad model!'
    };
    // Act
    const found = checkFrontmatter(fields, 'a');
    // Assert
    assert.deepEqual(ids(found), ['enum-value', 'enum-value', 'enum-value', 'boolean-value', 'max-turns']);
  });

  test('flags more than 32 skills', () => {
    // Arrange
    const fields = {
      name: 'a',
      description: 'Use proactively.',
      skills: Array.from({ length: 33 }, (_, i) => `s${i}`)
    };
    // Act
    const found = checkFrontmatter(fields, 'a');
    // Assert
    assert.deepEqual(ids(found), ['skills-count']);
  });

  test('flags fields a plugin agent ignores only for plugin scope', () => {
    // Arrange
    const fields = { name: 'a', description: 'Use proactively.', permissionMode: 'plan', hooks: '', mcpServers: '' };
    // Act
    const plugin = checkFrontmatter(fields, 'a', {}, 'plugin');
    const project = checkFrontmatter(fields, 'a', {}, 'project');
    // Assert
    assert.deepEqual(ids(plugin), ['scope-ignored', 'scope-ignored', 'scope-ignored']);
    assert.deepEqual(project, []);
  });

  test('warns on always-removed tools and specifier denylist entries', () => {
    // Arrange
    const fields = {
      name: 'a',
      description: 'Use proactively.',
      tools: 'Read, AskUserQuestion',
      disallowedTools: ['Bash(git push *)']
    };
    // Act
    const found = checkFrontmatter(fields, 'a');
    // Assert
    assert.deepEqual(ids(found), ['removed-tool', 'disallowed-specifier']);
  });

  test('warns when memory is set but tools lacks Write and Edit', () => {
    // Arrange
    const fields = { name: 'a', description: 'Use proactively.', tools: 'Read', memory: 'project' };
    // Act
    const found = checkFrontmatter(fields, 'a');
    // Assert
    assert.deepEqual(ids(found), ['memory-tools']);
  });

  test('does not warn about memory when tools is omitted or has Write', () => {
    // Arrange
    const inherit = { name: 'a', description: 'Use proactively.', memory: 'user' };
    const writes = { name: 'a', description: 'Use proactively.', tools: 'Read, Write', memory: 'user' };
    // Act
    const found = [...checkFrontmatter(inherit, 'a'), ...checkFrontmatter(writes, 'a')];
    // Assert
    assert.deepEqual(found, []);
  });
});

describe('checkBody', () => {
  test('passes a role, a numbered Task, and a later Return', () => {
    // Arrange
    const content = `---\nx: y\n---\n${BODY}`;
    // Act
    const found = checkBody(content, 3);
    // Assert
    assert.deepEqual(found, []);
  });

  test('ignores headings inside a fence', () => {
    // Arrange
    const content = `${BODY}\n\`\`\`text\n## Extra\n\`\`\`\n`;
    // Act
    const found = checkBody(content, 0);
    // Assert
    assert.deepEqual(found, []);
  });

  test('flags a body that opens with a heading or list', () => {
    // Arrange
    const heading = '# Title\n\n## Task\n\n1. x\n\n## Return\n';
    const list = '- a\n\n## Task\n\n1. x\n\n## Return\n';
    // Act
    const found = [...checkBody(heading, 0), ...checkBody(list, 0)];
    // Assert
    assert.deepEqual(ids(found), ['role-missing', 'role-missing']);
  });

  test('flags an empty body', () => {
    // Arrange
    const content = '---\nname: a\n---\n';
    // Act
    const found = checkBody(content, 3);
    // Assert
    assert.ok(ids(found).includes('role-missing'));
  });

  test('flags a missing Task and a missing Return', () => {
    // Arrange
    const content = 'Role.\n';
    // Act
    const found = checkBody(content, 0);
    // Assert
    assert.deepEqual(ids(found), ['task-missing', 'return-missing']);
  });

  test('flags a Task without numbered steps', () => {
    // Arrange
    const content = 'Role.\n\n## Task\n\n- a\n\n## Return\n';
    // Act
    const found = checkBody(content, 0);
    // Assert
    assert.deepEqual(ids(found), ['task-steps']);
  });

  test('flags Return placed before Task', () => {
    // Arrange
    const content = 'Role.\n\n## Return\n\nx\n\n## Task\n\n1. a\n';
    // Act
    const found = checkBody(content, 0);
    // Assert
    assert.deepEqual(ids(found), ['return-order']);
  });
});

describe('checkAgent', () => {
  test('returns ok for a valid agent', () => {
    // Arrange
    const deps = makeDeps(GOOD);
    // Act
    const result = checkAgent('/x/demo.md', { scope: 'plugin' }, deps);
    // Assert
    assert.deepEqual(result, { ok: true, errors: [], warnings: [] });
  });

  test('reports malformed frontmatter as an error', () => {
    // Arrange
    const deps = makeDeps('no frontmatter\n');
    // Act
    const result = checkAgent('/x/demo.md', {}, deps);
    // Assert
    assert.equal(result.ok, false);
    assert.equal(result.errors[0].id, 'frontmatter-malformed');
  });

  test('puts warnings aside from errors and tags the file name', () => {
    // Arrange
    const deps = makeDeps(GOOD.replace('name: demo', 'name: other'));
    // Act
    const result = checkAgent('/x/demo.md', {}, deps);
    // Assert
    assert.equal(result.ok, true);
    assert.equal(result.warnings[0].file, 'demo.md');
  });

  test('rethrows an unexpected read error', () => {
    // Arrange
    const failing = {
      ...makeDeps(GOOD),
      read: () => {
        throw new TypeError('boom');
      }
    };
    // Act
    const act = () => checkAgent('/x/demo.md', {}, failing);
    // Assert
    assert.throws(act, TypeError);
  });
});

describe('parseArgs', () => {
  test('parses a file and a scope', () => {
    // Arrange
    const argv = ['a.md', '--scope', 'plugin'];
    // Act
    const args = parseArgs(argv);
    // Assert
    assert.deepEqual(args, { file: 'a.md', scope: 'plugin' });
  });

  test('parses a file alone', () => {
    // Arrange
    const argv = ['a.md'];
    // Act
    const args = parseArgs(argv);
    // Assert
    assert.deepEqual(args, { file: 'a.md', scope: undefined });
  });

  test('rejects a bad scope, no file, and two files', () => {
    // Arrange
    const cases = [['a.md', '--scope', 'x'], [], ['a', 'b']];
    // Act
    const results = cases.map(parseArgs);
    // Assert
    assert.deepEqual(results, [{ usage: true }, { usage: true }, { usage: true }]);
  });
});

describe('main', () => {
  test('returns 0 and prints JSON for a valid agent', () => {
    // Arrange
    const deps = makeDeps(GOOD);
    // Act
    const code = main(['demo.md'], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(deps.out.logs[0]).ok, true);
  });

  test('returns 1 when there are errors', () => {
    // Arrange
    const deps = makeDeps('---\nname: demo\n---\nRole.\n');
    // Act
    const code = main(['demo.md'], deps);
    // Assert
    assert.equal(code, 1);
  });

  test('returns 2 with usage on bad arguments', () => {
    // Arrange
    const deps = makeDeps(GOOD);
    // Act
    const code = main([], deps);
    // Assert
    assert.equal(code, 2);
    assert.match(deps.out.errors[0], /usage/);
  });

  test('returns 2 when the file is missing', () => {
    // Arrange
    const deps = makeDeps(null);
    // Act
    const code = main(['gone.md'], deps);
    // Assert
    assert.equal(code, 2);
    assert.match(deps.out.errors[0], /not found/);
  });
});
