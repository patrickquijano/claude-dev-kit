import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  checkInjection,
  checkPins,
  checkRunners,
  checkStructure,
  main,
  parseYaml,
  runActionlint
} from '../../../../../skills/build-github-workflow/scripts/check-workflows.mjs';

const P = '.github/workflows/ci.yml';
const SHA = 'a'.repeat(40);

// Stub runner: `table` maps a command to its result; an unlisted command is not installed.
const runner = (table) => (cmd) => table[cmd] ?? { error: { code: 'ENOENT' } };
const ok = (stdout) => ({ status: 0, stdout, stderr: '' });

describe('parseYaml', () => {
  test('returns the parsed data from the first converter', () => {
    // Arrange
    const deps = { run: runner({ yq: ok('{"name":"ci"}') }) };
    // Act
    const res = parseYaml('name: ci', deps);
    // Assert
    assert.deepEqual(res, { status: 'pass', data: { name: 'ci' } });
  });

  test('falls through a converter without PyYAML to the next one', () => {
    // Arrange
    const deps = {
      run: runner({ python3: { status: 1, stdout: '', stderr: 'No module named yaml' }, ruby: ok('{"a":1}') })
    };
    // Act
    const res = parseYaml('a: 1', deps);
    // Assert
    assert.equal(res.status, 'pass');
  });

  test('fails with the first stderr line on a syntax error', () => {
    // Arrange
    const deps = { run: runner({ yq: { status: 1, stdout: '', stderr: 'bad yaml\nmore' } }) };
    // Act
    const res = parseYaml('a: [', deps);
    // Assert
    assert.deepEqual(res, { status: 'fail', error: 'bad yaml' });
  });

  test('is unverified when no converter is installed', () => {
    // Arrange
    const deps = { run: runner({}) };
    // Act
    const res = parseYaml('a: 1', deps);
    // Assert
    assert.deepEqual(res, { status: 'unverified' });
  });
});

describe('checkPins', () => {
  test('flags a tag pin', () => {
    // Arrange
    const text = '      - uses: actions/checkout@v4\n';
    // Act
    const findings = checkPins(P, text);
    // Assert
    assert.equal(findings.length, 1);
    assert.equal(findings[0].line, 1);
  });

  test('flags a SHA without a tag comment', () => {
    // Arrange
    const text = `      - uses: actions/checkout@${SHA} # v4\n`;
    // Act
    const findings = checkPins(P, text);
    // Assert
    assert.match(findings[0].message, /comment/);
  });

  test('accepts a SHA with an exact tag comment, a local call, and docker://', () => {
    // Arrange
    const text = `- uses: actions/checkout@${SHA} # v4.2.2\n- uses: ./.github/actions/x\n- uses: docker://alpine:3\n`;
    // Act
    const findings = checkPins(P, text);
    // Assert
    assert.deepEqual(findings, []);
  });

  test('ignores lines that are not uses', () => {
    // Arrange
    const text = '      run: echo uses: actions/checkout@v4\n';
    // Act
    const findings = checkPins(P, text);
    // Assert
    assert.deepEqual(findings, []);
  });
});

describe('checkRunners', () => {
  test('flags a latest runner label', () => {
    // Arrange
    const text = '    runs-on: ubuntu-latest\n';
    // Act
    const findings = checkRunners(P, text);
    // Assert
    assert.equal(findings[0].check, 'runners');
  });

  test('flags a latest label in a matrix list', () => {
    // Arrange
    const text = '        os: [windows-latest, macos-latest]\n';
    // Act
    const findings = checkRunners(P, text);
    // Assert
    assert.equal(findings.length, 1);
  });

  test('accepts a resolved label', () => {
    // Arrange
    const text = '    runs-on: ubuntu-24.04\n';
    // Act
    const findings = checkRunners(P, text);
    // Assert
    assert.deepEqual(findings, []);
  });

  test('ignores a comment', () => {
    // Arrange
    const text = '    # was ubuntu-latest\n';
    // Act
    const findings = checkRunners(P, text);
    // Assert
    assert.deepEqual(findings, []);
  });
});

describe('checkInjection', () => {
  test('flags event data inside a run block', () => {
    // Arrange
    const text = '      - run: |\n          echo "${{ github.event.pull_request.title }}"\n';
    // Act
    const findings = checkInjection(P, text);
    // Assert
    assert.equal(findings[0].line, 2);
  });

  test('flags head_ref in a one-line run', () => {
    // Arrange
    const text = '      - run: echo ${{ github.head_ref }}\n';
    // Act
    const findings = checkInjection(P, text);
    // Assert
    assert.equal(findings.length, 1);
  });

  test('accepts the value passed through env', () => {
    // Arrange
    const text = '      - env:\n          T: ${{ github.event.pull_request.title }}\n        run: echo "$T"\n';
    // Act
    const findings = checkInjection(P, text);
    // Assert
    assert.deepEqual(findings, []);
  });

  test('accepts a safe context inside run', () => {
    // Arrange
    const text = '      - run: echo ${{ github.sha }}\n';
    // Act
    const findings = checkInjection(P, text);
    // Assert
    assert.deepEqual(findings, []);
  });
});

describe('checkStructure', () => {
  test('flags missing permissions and a missing timeout', () => {
    // Arrange
    const text = 'jobs:\n  build:\n    runs-on: x\n';
    const data = { jobs: { build: { steps: [] } } };
    // Act
    const findings = checkStructure(P, text, data);
    // Assert
    assert.deepEqual(
      findings.map((f) => f.check),
      ['permissions', 'timeouts']
    );
    assert.equal(findings[1].line, 2);
  });

  test('accepts permissions and a timeout', () => {
    // Arrange
    const data = { permissions: {}, jobs: { build: { 'timeout-minutes': 5 } } };
    // Act
    const findings = checkStructure(P, '', data);
    // Assert
    assert.deepEqual(findings, []);
  });

  test('skips a caller job that uses a reusable workflow', () => {
    // Arrange
    const data = { permissions: {}, jobs: { call: { uses: './.github/workflows/r.yml' } } };
    // Act
    const findings = checkStructure(P, '', data);
    // Assert
    assert.deepEqual(findings, []);
  });

  test('returns nothing for a non-object document', () => {
    // Arrange
    const data = null;
    // Act
    const findings = checkStructure(P, '', data);
    // Assert
    assert.deepEqual(findings, []);
  });
});

describe('runActionlint', () => {
  test('passes on null output', () => {
    // Arrange
    const deps = { run: runner({ actionlint: ok('null') }) };
    // Act
    const res = runActionlint([P], deps);
    // Assert
    assert.deepEqual(res, { status: 'pass', findings: [] });
  });

  test('fails with a finding per reported error', () => {
    // Arrange
    const out = JSON.stringify([{ filepath: P, line: 3, message: 'bad' }]);
    const deps = { run: runner({ actionlint: { status: 1, stdout: out, stderr: '' } }) };
    // Act
    const res = runActionlint([P], deps);
    // Assert
    assert.equal(res.status, 'fail');
    assert.equal(res.findings[0].line, 3);
  });

  test('reports not installed when the binary is missing', () => {
    // Arrange
    const deps = { run: runner({}) };
    // Act
    const res = runActionlint([P], deps);
    // Assert
    assert.deepEqual(res, { status: 'not installed', findings: [] });
  });

  test('throws on another spawn error', () => {
    // Arrange
    const deps = { run: () => ({ error: new Error('boom') }) };
    // Act
    const act = () => runActionlint([P], deps);
    // Assert
    assert.throws(act, /boom/);
  });
});

describe('main', () => {
  const clean = `permissions:\n  contents: read\njobs:\n  a:\n    timeout-minutes: 5\n    steps:\n      - uses: actions/checkout@${SHA} # v4.2.2\n`;
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
  const data = JSON.stringify({ permissions: {}, jobs: { a: { 'timeout-minutes': 5 } } });

  test('exits 0 with ok and verified for a clean file', () => {
    // Arrange
    const files = { '/repo/ci.yml': clean };
    // Act
    const { code, out } = run(['ci.yml'], files, { yq: ok(data), actionlint: ok('null') });
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(out.logs[0]), {
      ok: true,
      verified: true,
      actionlint: 'pass',
      yaml: 'pass',
      findings: []
    });
  });

  test('reports verified false when actionlint is missing', () => {
    // Arrange
    const files = { '/repo/ci.yml': clean };
    // Act
    const { out } = run(['ci.yml'], files, { yq: ok(data) });
    // Assert
    assert.equal(JSON.parse(out.logs[0]).verified, false);
  });

  test('exits 1 with the findings for a bad pin', () => {
    // Arrange
    const files = { '/repo/ci.yml': '      - uses: actions/checkout@v4\n' };
    // Act
    const { code, out } = run(['ci.yml'], files, { yq: ok(data), actionlint: ok('null') });
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(out.logs[0]).findings[0].check, 'pins');
  });

  test('exits 2 with usage when no file is given', () => {
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
    const argv = ['../etc/passwd'];
    // Act
    const act = () => run(argv, {});
    // Assert
    assert.throws(act, /outside the working directory/);
  });
});
