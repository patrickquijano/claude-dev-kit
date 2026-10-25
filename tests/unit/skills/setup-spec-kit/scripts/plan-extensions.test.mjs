import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import {
  DEFAULT_WANTED,
  IGNORE_LINES,
  REQUIRED_SKILLS,
  latestTag,
  main,
  missingIgnoreLines,
  missingSkills,
  parseWanted,
  planExtensions
} from '../../../../../skills/setup-spec-kit/scripts/plan-extensions.mjs';

const CWD = path.resolve('/stub-project');
const WANTED = parseWanted(DEFAULT_WANTED);

function stubs({ list = '[]', files = {}, runError } = {}) {
  const out = { logs: [], errors: [], calls: [] };
  const deps = {
    cwd: () => CWD,
    existsSync: (p) => p in files,
    readFileSync: (p) => files[p],
    run: (cmd, args) => {
      out.calls.push([cmd, ...args]);
      if (runError) throw runError;
      return list;
    },
    log: (t) => out.logs.push(t),
    error: (t) => out.errors.push(t)
  };
  return { deps, out };
}

describe('parseWanted', () => {
  test('parses the default table in order', () => {
    // Arrange
    const text = DEFAULT_WANTED;
    // Act
    const result = parseWanted(text);
    // Assert
    assert.deepEqual(result, [
      { id: 'agent-context', priority: 10 },
      { id: 'assess', priority: 20 },
      { id: 'bug', priority: 30 }
    ]);
  });

  test('tolerates spaces and a trailing comma', () => {
    // Arrange
    const text = ' a=1 , b=2 ,';
    // Act
    const result = parseWanted(text);
    // Assert
    assert.deepEqual(result, [
      { id: 'a', priority: 1 },
      { id: 'b', priority: 2 }
    ]);
  });

  test('rejects an entry without a number', () => {
    // Arrange
    const text = 'a=x';
    // Act
    const act = () => parseWanted(text);
    // Assert
    assert.throws(act, /invalid --wanted entry "a=x"/);
  });

  test('rejects an empty list and a repeated id', () => {
    // Arrange
    const empty = '';
    const repeated = 'a=1,a=2';
    // Act
    const run = () => parseWanted(empty);
    const runRepeat = () => parseWanted(repeated);
    // Assert
    assert.throws(run, /lists no extensions/);
    assert.throws(runRepeat, /repeats an id/);
  });
});

describe('planExtensions', () => {
  test('adds an absent extension and fixes a wrong priority', () => {
    // Arrange
    const list = [
      { id: 'agent-context', priority: 10 },
      { id: 'assess', priority: 99 }
    ];
    // Act
    const result = planExtensions({ list, wanted: WANTED });
    // Assert
    assert.deepEqual(result, {
      adds: [{ id: 'bug', priority: 30 }],
      priorityFixes: [{ id: 'assess', from: 99, to: 20 }],
      ok: ['agent-context']
    });
  });

  test('accepts an object with an extensions array and reports all ok', () => {
    // Arrange
    const list = { extensions: WANTED.map((w) => ({ ...w })) };
    // Act
    const result = planExtensions({ list, wanted: WANTED });
    // Assert
    assert.deepEqual(result, { adds: [], priorityFixes: [], ok: ['agent-context', 'assess', 'bug'] });
  });

  test('throws when the JSON has no extensions array', () => {
    // Arrange
    const list = { foo: 1 };
    // Act
    const act = () => planExtensions({ list, wanted: WANTED });
    // Assert
    assert.throws(act, /extension list JSON/);
  });

  test('ignores entries without a string id, so the extension is added', () => {
    // Arrange
    const list = [null, { priority: 10 }, 'agent-context'];
    // Act
    const result = planExtensions({ list, wanted: [{ id: 'agent-context', priority: 10 }] });
    // Assert
    assert.deepEqual(result.adds, [{ id: 'agent-context', priority: 10 }]);
  });
});

describe('missingIgnoreLines', () => {
  test('returns every line for an absent file', () => {
    // Arrange
    const content = null;
    // Act
    const result = missingIgnoreLines({ content });
    // Assert
    assert.deepEqual(result, IGNORE_LINES);
  });

  test('returns only the lines not yet present, with CRLF endings', () => {
    // Arrange
    const content = `node_modules\r\n${IGNORE_LINES[0]}\r\n${IGNORE_LINES[2]}\r\n`;
    // Act
    const result = missingIgnoreLines({ content });
    // Assert
    assert.deepEqual(result, [IGNORE_LINES[1], IGNORE_LINES[3]]);
  });

  test('returns nothing when all lines are present', () => {
    // Arrange
    const content = IGNORE_LINES.join('\n');
    // Act
    const result = missingIgnoreLines({ content });
    // Assert
    assert.deepEqual(result, []);
  });

  test('does not treat a substring or comment as present', () => {
    // Arrange
    const content = `# ${IGNORE_LINES[0]}\n${IGNORE_LINES[1]}x\n`;
    // Act
    const result = missingIgnoreLines({ content });
    // Assert
    assert.deepEqual(result, IGNORE_LINES);
  });
});

describe('main', () => {
  test('prints the plan and missing lines, exit 0', () => {
    // Arrange
    const gi = path.join(CWD, '.gitignore');
    const { deps, out } = stubs({
      list: JSON.stringify([{ id: 'agent-context', priority: 10 }]),
      files: { [gi]: `${IGNORE_LINES[0]}\n` }
    });
    // Act
    const code = main([], deps);
    // Assert
    const res = JSON.parse(out.logs[0]);
    assert.equal(code, 0);
    assert.deepEqual(out.calls, [['specify', 'extension', 'list', '--json']]);
    assert.deepEqual(
      res.extensions.adds.map((a) => a.id),
      ['assess', 'bug']
    );
    assert.deepEqual(res.gitignore, { file: gi, exists: true, missing: IGNORE_LINES.slice(1) });
  });

  test('reports an absent .gitignore and honors --wanted', () => {
    // Arrange
    const { deps, out } = stubs({ list: '{"extensions":[]}' });
    // Act
    const code = main(['--wanted', 'x=5'], deps);
    // Assert
    const res = JSON.parse(out.logs[0]);
    assert.equal(code, 0);
    assert.deepEqual(res.extensions.adds, [{ id: 'x', priority: 5 }]);
    assert.equal(res.gitignore.exists, false);
    assert.deepEqual(res.gitignore.missing, IGNORE_LINES);
  });

  test('exits 2 with usage on an unknown flag', () => {
    // Arrange
    const { deps, out } = stubs();
    // Act
    const code = main(['--bogus', '1'], deps);
    // Assert
    assert.equal(code, 2);
    assert.match(out.errors[0], /usage:/);
    assert.deepEqual(out.calls, []);
  });

  test('rejects a --gitignore path outside the project', () => {
    // Arrange
    const { deps, out } = stubs();
    // Act
    const code = main(['--gitignore', '../other/.gitignore'], deps);
    // Assert
    assert.equal(code, 1);
    assert.match(JSON.parse(out.logs[0]).error, /outside the project/);
  });

  test('reports non-JSON CLI output as ok:false', () => {
    // Arrange
    const { deps, out } = stubs({ list: 'not json' });
    // Act
    const code = main([], deps);
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(out.logs[0]).ok, false);
  });

  test('rethrows a command failure instead of swallowing it', () => {
    // Arrange
    const { deps } = stubs({ runError: new Error('spawn specify ENOENT') });
    // Act
    const act = () => main([], deps);
    // Assert
    assert.throws(act, /ENOENT/);
  });

  test('reports a malformed --wanted as ok:false', () => {
    // Arrange
    const { deps, out } = stubs();
    // Act
    const code = main(['--wanted', 'bad'], deps);
    // Assert
    assert.equal(code, 1);
    assert.match(JSON.parse(out.logs[0]).error, /invalid --wanted/);
  });
});

describe('latestTag', () => {
  const ls = (...tags) => tags.map((t) => `abc123\trefs/tags/${t}`).join('\n');

  test('picks the highest vX.Y.Z numerically', () => {
    // Arrange
    const text = ls('v1.2.2', 'v1.10.0', 'v1.9.9');
    // Act
    const tag = latestTag(text);
    // Assert
    assert.equal(tag, 'v1.10.0');
  });

  test('ignores pre-release and non-version tags', () => {
    // Arrange
    const text = ls('v2.0.0-rc1', 'nightly', 'v1.0.0');
    // Act
    const tag = latestTag(text);
    // Assert
    assert.equal(tag, 'v1.0.0');
  });

  test('returns null when no tag matches', () => {
    // Arrange
    const text = ls('nightly', 'v1.0');
    // Act
    const tag = latestTag(text);
    // Assert
    assert.equal(tag, null);
  });

  test('returns null for empty or missing output', () => {
    // Arrange
    const inputs = ['', undefined];
    // Act
    const tags = inputs.map(latestTag);
    // Assert
    assert.deepEqual(tags, [null, null]);
  });
});

describe('missingSkills', () => {
  test('reports nothing when every dir exists', () => {
    // Arrange
    const exists = () => true;
    // Act
    const result = missingSkills({ exists });
    // Assert
    assert.deepEqual(result, {});
  });

  test('groups missing dirs by source', () => {
    // Arrange
    const exists = (n) => n !== 'speckit-bug-fix' && n !== 'speckit-plan';
    // Act
    const result = missingSkills({ exists });
    // Assert
    assert.deepEqual(result, { core: ['speckit-plan'], bug: ['speckit-bug-fix'] });
  });

  test('reports every dir when none exist', () => {
    // Arrange
    const exists = () => false;
    // Act
    const result = missingSkills({ exists });
    // Assert
    assert.deepEqual(result, REQUIRED_SKILLS);
  });

  test('honors a custom skills table', () => {
    // Arrange
    const skills = { x: ['a', 'b'] };
    // Act
    const result = missingSkills({ exists: (n) => n === 'a', skills });
    // Assert
    assert.deepEqual(result, { x: ['b'] });
  });
});

describe('main --latest-tag', () => {
  test('prints the highest tag from ls-remote', () => {
    // Arrange
    const { deps, out } = stubs({ list: 'x\trefs/tags/v0.3.0\nx\trefs/tags/v0.4.1' });
    // Act
    const code = main(['--latest-tag'], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(out.logs[0]), { ok: true, tag: 'v0.4.1' });
    assert.deepEqual(out.calls[0].slice(0, 3), ['git', 'ls-remote', '--tags']);
  });

  test('reports ok:false when no tag exists', () => {
    // Arrange
    const { deps, out } = stubs({ list: '' });
    // Act
    const code = main(['--latest-tag'], deps);
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(out.logs[0]).ok, false);
  });

  test('rejects --latest-tag combined with another flag', () => {
    // Arrange
    const { deps, out } = stubs();
    // Act
    const code = main(['--latest-tag', '--wanted'], deps);
    // Assert
    assert.equal(code, 2);
    assert.deepEqual(out.calls, []);
  });

  test('reports missing skill dirs in the plan', () => {
    // Arrange
    const { deps, out } = stubs({ list: '[]' });
    // Act
    const code = main([], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(out.logs[0]).skills.missing, REQUIRED_SKILLS);
  });
});
