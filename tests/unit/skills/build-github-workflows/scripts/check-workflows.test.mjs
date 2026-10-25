import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  checkNaming,
  checkPins,
  checkPosix,
  main
} from '../../../../../skills/build-github-workflows/scripts/check-workflows.mjs';

const P = '.github/workflows/_test.yml';

describe('checkPosix', () => {
  test('flags a bashism in a block scalar', () => {
    // Arrange
    const text = 'steps:\n  - run: |\n      set -eu\n      if [[ -n "$X" ]]; then echo hi; fi\n';
    // Act
    const findings = checkPosix(P, text);
    // Assert
    assert.equal(findings.length, 1);
    assert.equal(findings[0].line, 4);
  });

  test('flags a single-line run with an array and echo -e', () => {
    // Arrange
    const text = '      run: a=(1 2); echo -e hi\n';
    // Act
    const findings = checkPosix(P, text);
    // Assert
    assert.equal(findings.length, 2);
  });

  test('accepts POSIX sh', () => {
    // Arrange
    const text = '      run: |\n        set -eu\n        if [ "$X" = a ]; then printf "%s\\n" "$(date)"; fi\n';
    // Act
    const findings = checkPosix(P, text);
    // Assert
    assert.deepEqual(findings, []);
  });

  test('ignores bashisms outside run blocks and after the block ends', () => {
    // Arrange
    const text = '      run: |\n        echo ok\n      name: use [[ here\n      with:\n        x: source y\n';
    // Act
    const findings = checkPosix(P, text);
    // Assert
    assert.deepEqual(findings, []);
  });
});

describe('checkPins', () => {
  test('accepts an exact tag and a SHA with a tag comment', () => {
    // Arrange
    const sha = 'a'.repeat(40);
    const text = `      - uses: actions/checkout@v4.2.2\n      - uses: actions/cache@${sha} # v4.0.1\n`;
    // Act
    const findings = checkPins(P, text);
    // Assert
    assert.deepEqual(findings, []);
  });

  test('flags a floating major, a branch, and a SHA without a comment', () => {
    // Arrange
    const sha = 'b'.repeat(40);
    const text = `      - uses: actions/checkout@v4\n      - uses: org/a@main\n      - uses: org/b@${sha}\n`;
    // Act
    const findings = checkPins(P, text);
    // Assert
    assert.equal(findings.length, 3);
  });

  test('flags a local call that has an @ref and accepts one without', () => {
    // Arrange
    const text = '    uses: ./.github/workflows/_build.yml@v1.0.0\n    uses: ./.github/actions/setup\n';
    // Act
    const findings = checkPins(P, text);
    // Assert
    assert.deepEqual(
      findings.map((f) => f.line),
      [1]
    );
  });

  test('flags latest and a bare major image, accepts an exact tag', () => {
    // Arrange
    const text =
      '    image: node:latest\n    image: postgres:16\n    image: redis:7.4.1\n    image: ghcr.io/o/r:1.2.3\n';
    // Act
    const findings = checkPins(P, text);
    // Assert
    assert.deepEqual(
      findings.map((f) => f.line),
      [1, 2]
    );
  });
});

describe('checkNaming', () => {
  test('accepts a conforming callee stem', () => {
    // Arrange
    const path = '.github/workflows/_test-unit.yml';
    // Act
    const findings = checkNaming(path, 'on:\n  workflow_call:\n');
    // Assert
    assert.deepEqual(findings, []);
  });

  test('reports a callee outside the verb list as info', () => {
    // Arrange
    const path = '.github/workflows/_compile.yml';
    // Act
    const findings = checkNaming(path, 'on:\n  workflow_call:\n');
    // Assert
    assert.equal(findings.length, 1);
    assert.match(findings[0].message, /^info:/);
  });

  test('reports an unprefixed file that declares workflow_call', () => {
    // Arrange
    const path = '.github/workflows/build.yml';
    // Act
    const findings = checkNaming(path, 'on:\n  workflow_call:\n');
    // Assert
    assert.equal(findings.length, 1);
  });

  test('skips orchestrators and composite actions', () => {
    // Arrange
    const orchestrator = ['.github/workflows/ci.yml', 'on:\n  push:\n'];
    const action = ['.github/actions/setup/action.yml', 'runs:\n  using: composite\n'];
    // Act
    const findings = [checkNaming(...orchestrator), checkNaming(...action)];
    // Assert
    assert.deepEqual(findings, [[], []]);
  });
});

describe('main', () => {
  function run(argv, files = {}) {
    const out = { logs: [], errors: [] };
    const code = main(argv, {
      cwd: () => '/repo',
      readFile: (p) => files[p],
      log: (t) => out.logs.push(t),
      error: (t) => out.errors.push(t)
    });
    return { code, out };
  }

  test('exits 0 with ok true for a clean file', () => {
    // Arrange
    const files = { '/repo/ci.yml': '      - uses: actions/checkout@v4.2.2\n' };
    // Act
    const { code, out } = run(['ci.yml'], files);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(out.logs[0]), { ok: true, findings: [] });
  });

  test('exits 1 with the findings for a bad pin', () => {
    // Arrange
    const files = { '/repo/ci.yml': '      - uses: actions/checkout@v4\n' };
    // Act
    const { code, out } = run(['ci.yml'], files);
    // Assert
    assert.equal(code, 1);
    assert.equal(JSON.parse(out.logs[0]).findings[0].check, 'pins');
  });

  test('exits 2 with usage when no file is given', () => {
    // Arrange
    const argv = [];
    // Act
    const { code, out } = run(argv);
    // Assert
    assert.equal(code, 2);
    assert.match(out.errors[0], /usage/);
  });

  test('throws for a path outside the working directory', () => {
    // Arrange
    const argv = ['../etc/passwd'];
    // Act
    const act = () => run(argv);
    // Assert
    assert.throws(act, /outside the working directory/);
  });
});
