import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import { applyAppends, main, readState } from '../../../../../skills/setup-graphify/scripts/graphify-state.mjs';

const ROOT = '/repo';
const HOME = '/home/u';
const ASSET = '/asset/graphify-rules.md';
const at = (...p) => path.join(ROOT, ...p);

function fsStub(files = {}) {
  const store = new Map(Object.entries(files));
  const writes = [];
  return {
    writes,
    store,
    deps: {
      home: HOME,
      assetPath: ASSET,
      exists: (p) => store.has(p),
      read: (p) => store.get(p),
      write: (p, text) => {
        writes.push([p, text]);
        store.set(p, text);
      },
      list: (dir) => [...store.keys()].filter((p) => path.dirname(p) === dir).map((p) => path.basename(p))
    }
  };
}

const GRAPH = {
  [at('graphify-out', 'graph.html')]: '',
  [at('graphify-out', 'GRAPH_REPORT.md')]: '# r\n',
  [at('graphify-out', 'graph.json')]: '{}'
};

describe('readState', () => {
  test('reports a fully set-up repo', () => {
    // Arrange
    const { deps } = fsStub({
      ...GRAPH,
      [at('.claude', 'skills', 'graphify', '.graphify_version')]: '1',
      [at('.claude', 'settings.json')]: '{"hooks":"graphify hook-guard"}',
      [at('.claude', 'rules', 'graphify.md')]: 'rules',
      [ASSET]: 'rules',
      [at('CLAUDE.md')]: '# x\n## graphify\n',
      [at('.gitignore')]: 'graphify-out/*\n!graphify-out/graph.json\n!graphify-out/GRAPH_REPORT.md\n'
    });
    // Act
    const state = readState({ root: ROOT }, deps);
    // Assert
    assert.equal(state.skill, 'project');
    assert.equal(state.claudeHooks, true);
    assert.equal(state.graph.present, true);
    assert.equal(state.rules, 'identical');
    assert.equal(state.claudeMdSection, true);
    assert.deepEqual(state.gitignore.missing, []);
  });

  test('counts placeholder community names and finds a user-level skill', () => {
    // Arrange
    const report = '### Community 1 - "Community 1"\n### Community 2 - "Auth"\n### Community 3 - "Community 3"\n';
    const { deps } = fsStub({
      ...GRAPH,
      [at('graphify-out', 'GRAPH_REPORT.md')]: report,
      [path.join(HOME, '.claude', 'skills', 'graphify', '.graphify_version')]: '1'
    });
    // Act
    const state = readState({ root: ROOT }, deps);
    // Assert
    assert.equal(state.placeholders, 2);
    assert.equal(state.skill, 'user');
  });

  test('reports an empty repo as nothing done', () => {
    // Arrange
    const { deps } = fsStub();
    // Act
    const state = readState({ root: ROOT }, deps);
    // Assert
    assert.equal(state.skill, 'none');
    assert.equal(state.claudeHooks, false);
    assert.deepEqual(state.graph.missing, ['graph.html', 'GRAPH_REPORT.md', 'graph.json']);
    assert.equal(state.rules, 'absent');
    assert.equal(state.gitignore.exists, false);
  });

  test('flags a differing rules file, a blocking gitignore line, and skips .eslintignore with a flat config', () => {
    // Arrange
    const { deps } = fsStub({
      [at('.claude', 'rules', 'graphify.md')]: 'mine',
      [ASSET]: 'plugin',
      [at('.gitignore')]: 'node_modules\n/graphify-out\n',
      [at('.eslintignore')]: 'dist\n',
      [at('eslint.config.mjs')]: ''
    });
    // Act
    const state = readState({ root: ROOT }, deps);
    // Assert
    assert.equal(state.rules, 'differs');
    assert.equal(state.gitignore.conflict, '/graphify-out');
    assert.deepEqual(state.ignoreFiles, []);
  });

  test('rejects a relative root', () => {
    // Arrange
    const { deps } = fsStub();
    // Act
    const state = readState({ root: 'repo' }, deps);
    // Assert
    assert.deepEqual(state, { ok: false, error: 'root must be an absolute path' });
  });
});

describe('applyAppends', () => {
  test('appends only the missing gitignore lines and the missing ignore entries', () => {
    // Arrange
    const { deps, store } = fsStub({
      [at('.gitignore')]: 'node_modules\ngraphify-out/*',
      [at('.prettierignore')]: 'dist\n',
      [at('.dockerignore')]: 'graphify-out/\n'
    });
    // Act
    const result = applyAppends({ root: ROOT }, deps);
    // Assert
    assert.equal(
      store.get(at('.gitignore')),
      'node_modules\ngraphify-out/*\n!graphify-out/graph.json\n!graphify-out/GRAPH_REPORT.md\n'
    );
    assert.equal(store.get(at('.prettierignore')), 'dist\ngraphify-out/\n');
    assert.deepEqual(
      result.changes.map((c) => c.file),
      ['.gitignore', '.prettierignore']
    );
  });

  test('creates the gitignore only when asked', () => {
    // Arrange
    const withFlag = fsStub();
    const without = fsStub();
    // Act
    const created = applyAppends({ root: ROOT, createGitignore: true }, withFlag.deps);
    const skipped = applyAppends({ root: ROOT }, without.deps);
    // Assert
    assert.equal(
      withFlag.store.get(at('.gitignore')),
      'graphify-out/*\n!graphify-out/graph.json\n!graphify-out/GRAPH_REPORT.md\n'
    );
    assert.equal(created.changes.length, 1);
    assert.deepEqual(skipped.skipped, [{ file: '.gitignore', reason: 'absent' }]);
    assert.equal(without.writes.length, 0);
  });

  test('leaves a gitignore with a blocking line untouched', () => {
    // Arrange
    const { deps, writes } = fsStub({ [at('.gitignore')]: 'graphify-out/\n' });
    // Act
    const result = applyAppends({ root: ROOT, createGitignore: true }, deps);
    // Assert
    assert.equal(writes.length, 0);
    assert.deepEqual(result.skipped, [{ file: '.gitignore', reason: 'existing line graphify-out/' }]);
  });

  test('writes nothing when every entry is present', () => {
    // Arrange
    const { deps, writes } = fsStub({
      [at('.gitignore')]: 'graphify-out/*\n!graphify-out/graph.json\n!graphify-out/GRAPH_REPORT.md\n',
      [at('.prettierignore')]: 'graphify-out/\n'
    });
    // Act
    const result = applyAppends({ root: ROOT }, deps);
    // Assert
    assert.equal(writes.length, 0);
    assert.deepEqual(result, { ok: true, changes: [], skipped: [] });
  });

  test('rejects a relative root', () => {
    // Arrange
    const { deps } = fsStub();
    // Act
    const result = applyAppends({ root: '.' }, deps);
    // Assert
    assert.equal(result.ok, false);
  });
});

describe('main', () => {
  const run = async (argv, files = {}) => {
    const { deps, writes } = fsStub(files);
    const out = { logs: [], errors: [] };
    const code = await main(argv, { ...deps, log: (t) => out.logs.push(t), error: (t) => out.errors.push(t) });
    return { code, out, writes };
  };

  test('prints the state as JSON, exit 0', async () => {
    // Arrange
    const argv = ['state', '--root', ROOT];
    // Act
    const { code, out, writes } = await run(argv);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(out.logs[0]).skill, 'none');
    assert.equal(writes.length, 0);
  });

  test('append writes and prints the changes, exit 0', async () => {
    // Arrange
    const argv = ['append', '--root', ROOT, '--create-gitignore'];
    // Act
    const { code, out, writes } = await run(argv);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(out.logs[0]).changes[0].file, '.gitignore');
    assert.equal(writes.length, 1);
  });

  test('exits 2 with usage on a missing root or unknown command', async () => {
    // Arrange
    const bad = [['state'], ['bogus', '--root', ROOT]];
    // Act
    const codes = [];
    for (const argv of bad) codes.push((await run(argv)).code);
    // Assert
    assert.deepEqual(codes, [2, 2]);
  });

  test('exits 2 when --create-gitignore is passed to state', async () => {
    // Arrange
    const argv = ['state', '--root', ROOT, '--create-gitignore'];
    // Act
    const { code, out } = await run(argv);
    // Assert
    assert.equal(code, 2);
    assert.match(out.errors[0], /usage:/);
  });

  test('exits 1 on a relative root', async () => {
    // Arrange
    const argv = ['state', '--root', 'repo'];
    // Act
    const { code } = await run(argv);
    // Assert
    assert.equal(code, 1);
  });
});
