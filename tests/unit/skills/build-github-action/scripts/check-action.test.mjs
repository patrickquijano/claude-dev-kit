import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  checkMetadata,
  checkSteps,
  main,
  parseYaml
} from '../../../../../skills/build-github-action/scripts/check-action.mjs';

const runner = (table) => (cmd) => table[cmd] ?? { error: { code: 'ENOENT' } };
const ok = (stdout) => ({ status: 0, stdout, stderr: '' });
const good = {
  name: 'x',
  description: 'd',
  author: 'me',
  inputs: { who: { description: 'w', required: false, default: 'a' } },
  outputs: { 'out-put': { description: 'o' } },
  runs: { using: 'composite', steps: [] }
};
const checks = (findings) => findings.map((f) => f.check);

describe('parseYaml', () => {
  test('returns the parsed data', () => {
    // Arrange
    const deps = { run: runner({ yq: ok('{"a":1}') }) };
    // Act
    const res = parseYaml('a: 1', deps);
    // Assert
    assert.deepEqual(res, { status: 'pass', data: { a: 1 } });
  });

  test('falls through a converter without PyYAML', () => {
    // Arrange
    const deps = {
      run: runner({ python3: { status: 1, stdout: '', stderr: 'No module named yaml' }, ruby: ok('{}') })
    };
    // Act
    const res = parseYaml('', deps);
    // Assert
    assert.equal(res.status, 'pass');
  });

  test('fails on a syntax error', () => {
    // Arrange
    const deps = { run: runner({ yq: { status: 1, stdout: '', stderr: 'bad\nmore' } }) };
    // Act
    const res = parseYaml('a: [', deps);
    // Assert
    assert.deepEqual(res, { status: 'fail', error: 'bad' });
  });

  test('is unverified without a converter', () => {
    // Arrange
    const deps = { run: runner({}) };
    // Act
    const res = parseYaml('a: 1', deps);
    // Assert
    assert.deepEqual(res, { status: 'unverified' });
  });
});

describe('checkMetadata', () => {
  test('accepts a complete action', () => {
    // Arrange
    const data = good;
    // Act
    const findings = checkMetadata(data);
    // Assert
    assert.deepEqual(findings, []);
  });

  test('accepts a node action with main and a docker action with image', () => {
    // Arrange
    const node = { ...good, runs: { using: 'node20', main: 'dist/index.js' } };
    const docker = { ...good, runs: { using: 'docker', image: 'Dockerfile' } };
    // Act
    const findings = [...checkMetadata(node), ...checkMetadata(docker)];
    // Assert
    assert.deepEqual(findings, []);
  });

  test('flags missing name, description, author, and runs.using', () => {
    // Arrange
    const data = {};
    // Act
    const findings = checkMetadata(data);
    // Assert
    assert.deepEqual(checks(findings), ['metadata', 'metadata', 'metadata', 'runs']);
  });

  test('flags a node action without main and a docker action without image', () => {
    // Arrange
    const node = { ...good, runs: { using: 'node20' } };
    const docker = { ...good, runs: { using: 'docker' } };
    // Act
    const findings = [...checkMetadata(node), ...checkMetadata(docker)];
    // Assert
    assert.equal(findings.length, 2);
  });

  test('flags a bad input and a bad output', () => {
    // Arrange
    const data = { ...good, inputs: { Bad_Name: { required: false } }, outputs: { o_1: {} } };
    // Act
    const findings = checkMetadata(data);
    // Assert
    assert.equal(findings.filter((f) => f.check === 'inputs').length, 3);
    assert.equal(findings.filter((f) => f.check === 'outputs').length, 2);
  });

  test('flags a document that is not a mapping', () => {
    // Arrange
    const data = ['x'];
    // Act
    const findings = checkMetadata(data);
    // Assert
    assert.equal(findings.length, 1);
  });
});

describe('checkSteps', () => {
  test('accepts a step with shell and env', () => {
    // Arrange
    const data = { runs: { steps: [{ run: 'echo "$W"', shell: 'sh', env: { W: '${{ inputs.who }}' } }] } };
    // Act
    const findings = checkSteps(data);
    // Assert
    assert.deepEqual(findings, []);
  });

  test('ignores uses steps', () => {
    // Arrange
    const data = { runs: { steps: [{ uses: 'actions/checkout@x' }] } };
    // Act
    const findings = checkSteps(data);
    // Assert
    assert.deepEqual(findings, []);
  });

  test('flags a run without shell', () => {
    // Arrange
    const data = { runs: { steps: [{ name: 'a', run: 'echo' }] } };
    // Act
    const findings = checkSteps(data);
    // Assert
    assert.equal(findings[0].check, 'steps');
  });

  test('flags an input interpolated into run', () => {
    // Arrange
    const data = { runs: { steps: [{ run: 'echo ${{ inputs.who }}', shell: 'sh' }] } };
    // Act
    const findings = checkSteps(data);
    // Assert
    assert.deepEqual(checks(findings), ['injection']);
  });
});

describe('main', () => {
  const run = (argv, files, table) => {
    const out = { logs: [], errors: [] };
    const deps = {
      cwd: () => '/repo',
      readFile: (p) => files[p],
      run: runner(table ?? {}),
      log: (t) => out.logs.push(t),
      error: (t) => out.errors.push(t)
    };
    return { code: main(argv, deps), out };
  };

  test('exits 0 for a good action directory', () => {
    // Arrange
    const files = { '/repo/act/action.yml': 'x' };
    // Act
    const { code, out } = run(['act'], files, { yq: ok(JSON.stringify(good)) });
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(out.logs[0]), { ok: true, yaml: 'pass', findings: [] });
  });

  test('flags a file not named action.yml', () => {
    // Arrange
    const files = { '/repo/act/other.yml': 'x' };
    // Act
    const { code, out } = run(['act/other.yml'], files, { yq: ok(JSON.stringify(good)) });
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(out.logs[0]).findings[0].check, 'file');
  });

  test('exits 1 when YAML cannot be verified', () => {
    // Arrange
    const files = { '/repo/act/action.yml': 'x' };
    // Act
    const { code, out } = run(['act'], files);
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(out.logs[0]).yaml, 'unverified');
  });

  test('exits 2 with usage without an argument', () => {
    // Arrange
    const argv = [];
    // Act
    const { code, out } = run(argv, {});
    // Assert
    assert.equal(code, 2);
    assert.match(out.errors[0], /usage/);
  });

  test('throws for a path outside the working directory', () => {
    // Arrange
    const argv = ['../x'];
    // Act
    const act = () => run(argv, {});
    // Assert
    assert.throws(act, /outside the working directory/);
  });
});
