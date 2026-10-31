import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  formatTimeLeft,
  formatTokens,
  gitBranch,
  paint,
  render,
  tokenColor,
  usageColor
} from '../../../../../skills/update-statusline/assets/statusline.mjs';

const ESC = String.fromCharCode(27);
const CSI = String.fromCharCode(0x9b);
const BIDI = String.fromCharCode(0x202e);
const BOLD = `${ESC}[1m`;
const CYAN = `${ESC}[36m`;
const BLUE = `${ESC}[34m`;
const MAGENTA = `${ESC}[35m`;
const RESET = `${ESC}[0m`;
const BRANCH = `${ESC}[38;5;205m`;
const GREEN = `${ESC}[32m`;
const YELLOW = `${ESC}[33m`;
const ORANGE = `${ESC}[38;5;208m`;
const RED = `${ESC}[31m`;
const INPUT = { cwd: '/work/app', model: { display_name: 'Model' } };
const NOW = 1_000;
const PLAIN = { NO_COLOR: '1' };

const renderWith = (name, input = INPUT, env = {}) => render(input, { nowSeconds: NOW, branch: () => name, env });

describe('paint', () => {
  test('wraps text in the styles and a reset', () => {
    // Act
    const text = paint('hi', [BOLD, GREEN], {});

    // Assert
    assert.equal(text, `${BOLD}${GREEN}hi${RESET}`);
  });

  test('wraps text in a reset alone without styles', () => {
    // Act
    const text = paint('hi', [], {});

    // Assert
    assert.equal(text, `hi${RESET}`);
  });

  test('returns the plain text when NO_COLOR is set', () => {
    // Act
    const text = paint('hi', [BOLD], PLAIN);

    // Assert
    assert.equal(text, 'hi');
  });

  test('does not treat an empty NO_COLOR as set', () => {
    // Act
    const text = paint('hi', [BOLD], { NO_COLOR: '' });

    // Assert
    assert.equal(text, `${BOLD}hi${RESET}`);
  });
});

describe('render branch segment', () => {
  test('emphasizes the branch name with bold and the branch color', () => {
    // Act
    const line = renderWith('feat/x');

    // Assert
    assert.ok(line.includes(`${BOLD}${BRANCH}feat/x${RESET}`));
  });

  test('keeps the git( and ) wrapper in its own color', () => {
    // Act
    const line = renderWith('main');

    // Assert
    assert.ok(line.includes(`${MAGENTA}git(${RESET}`));
    assert.ok(line.includes(`${MAGENTA})${RESET}`));
  });

  test('prints no escapes when NO_COLOR is set', () => {
    // Act
    const line = renderWith('main', INPUT, PLAIN);

    // Assert
    assert.equal(line.includes(ESC), false);
    assert.ok(line.includes('git(main)'));
  });

  test('omits the branch segment without a branch', () => {
    // Act
    const line = renderWith(null);

    // Assert
    assert.equal(line.includes('git('), false);
  });

  test('leaves the other segments unchanged', () => {
    // Act
    const line = renderWith('main');

    // Assert
    assert.ok(line.includes(paint('app', [BOLD, CYAN], {})));
    assert.ok(line.includes(paint('Model', [BOLD, BLUE], {})));
  });
});

describe('formatTokens', () => {
  test('prints counts under a thousand as is', () => {
    // Act
    const text = formatTokens(999);

    // Assert
    assert.equal(text, '999');
  });

  test('prints thousands with two, one, or no decimals by magnitude', () => {
    // Act
    const texts = [formatTokens(1_234), formatTokens(12_345), formatTokens(123_456)];

    // Assert
    assert.deepEqual(texts, ['1.23k', '12.3k', '123k']);
  });

  test('prints millions with two or one decimals', () => {
    // Act
    const texts = [formatTokens(1_234_567), formatTokens(12_345_678)];

    // Assert
    assert.deepEqual(texts, ['1.23m', '12.3m']);
  });

  test('chooses the tier on the rounded value', () => {
    // Act
    const texts = [formatTokens(9_999), formatTokens(999_999)];

    // Assert
    assert.deepEqual(texts, ['10.0k', '1.00m']);
  });

  test('rounds fractional counts below a thousand', () => {
    // Act
    const text = formatTokens(0.4);

    // Assert
    assert.equal(text, '0');
  });
});

describe('tokenColor', () => {
  test('maps each tier to its color', () => {
    // Act
    const colors = [tokenColor(0), tokenColor(50_000), tokenColor(100_000), tokenColor(150_000)];

    // Assert
    assert.deepEqual(colors, [GREEN, YELLOW, ORANGE, RED]);
  });

  test('keeps a tier just under its boundary', () => {
    // Act
    const colors = [tokenColor(49_999), tokenColor(99_999), tokenColor(149_999)];

    // Assert
    assert.deepEqual(colors, [GREEN, YELLOW, ORANGE]);
  });
});

describe('usageColor', () => {
  test('maps each tier to its color', () => {
    // Act
    const colors = [usageColor(0), usageColor(35), usageColor(70)];

    // Assert
    assert.deepEqual(colors, [GREEN, YELLOW, RED]);
  });

  test('keeps a tier just under its boundary', () => {
    // Act
    const colors = [usageColor(34.9), usageColor(69.9), usageColor(100)];

    // Assert
    assert.deepEqual(colors, [GREEN, YELLOW, RED]);
  });
});

describe('formatTimeLeft', () => {
  test('prints minutes only under an hour, rounding partial minutes up', () => {
    // Act
    const texts = [formatTimeLeft(30, false), formatTimeLeft(61, false), formatTimeLeft(3_600, false)];

    // Assert
    assert.deepEqual(texts, ['1m', '2m', '60m']);
  });

  test('prints hours and minutes over an hour', () => {
    // Act
    const text = formatTimeLeft(3_660, false);

    // Assert
    assert.equal(text, '1h 1m');
  });

  test('prints days only when allowed and more than a day remains', () => {
    // Act
    const texts = [formatTimeLeft(90_060, true), formatTimeLeft(90_060, false), formatTimeLeft(86_400, true)];

    // Assert
    assert.deepEqual(texts, ['1d 1h 1m', '25h 1m', '24h 0m']);
  });

  test('never prints under one minute', () => {
    // Act
    const texts = [formatTimeLeft(0, false), formatTimeLeft(-50, true)];

    // Assert
    assert.deepEqual(texts, ['1m', '1m']);
  });
});

describe('gitBranch', () => {
  const failure = (props) => Object.assign(new Error('git failed'), props);

  test('returns the symbolic branch name', () => {
    // Arrange
    const calls = [];
    const run = (command, args) => {
      calls.push([command, args]);

      return 'main\n';
    };

    // Act
    const name = gitBranch('/work/app', run);

    // Assert
    assert.equal(name, 'main');
    assert.deepEqual(calls[0][1].slice(0, 2), ['-C', '/work/app']);
    assert.equal(calls.length, 1);
  });

  test('falls back to the short hash on a detached HEAD', () => {
    // Arrange
    const run = (command, args) => {
      if (args.includes('symbolic-ref')) {
        throw failure({ status: 128 });
      }

      return 'abc1234\n';
    };

    // Act
    const name = gitBranch('/work/app', run);

    // Assert
    assert.equal(name, 'abc1234');
  });

  test('returns null without a directory', () => {
    // Act
    const name = gitBranch(undefined, () => {
      throw new Error('must not run');
    });

    // Assert
    assert.equal(name, null);
  });

  test('returns null when git is missing or times out', () => {
    // Act
    const names = [
      gitBranch('/work/app', () => {
        throw failure({ code: 'ENOENT' });
      }),
      gitBranch('/work/app', () => {
        throw failure({ code: 'ETIMEDOUT' });
      })
    ];

    // Assert
    assert.deepEqual(names, [null, null]);
  });

  test('rethrows an unexpected error', () => {
    // Arrange
    const run = () => {
      throw failure({ code: 'EACCES' });
    };

    // Act
    const act = () => gitBranch('/work/app', run);

    // Assert
    assert.throws(act, { code: 'EACCES' });
  });

  test('rethrows an unexpected error from the fallback', () => {
    // Arrange
    const run = (command, args) => {
      if (args.includes('symbolic-ref')) {
        throw failure({ status: 128 });
      }

      throw failure({ code: 'EACCES' });
    };

    // Act
    const act = () => gitBranch('/work/app', run);

    // Assert
    assert.throws(act, { code: 'EACCES' });
  });
});

describe('render', () => {
  test('prints the token count and context percentage computed from the window size', () => {
    // Arrange
    const input = { context_window: { total_input_tokens: 12_345, context_window_size: 100_000 } };

    // Act
    const line = renderWith(null, input, PLAIN);

    // Assert
    assert.equal(line, '12.3k │ 12%');
  });

  test('prefers the reported context percentage', () => {
    // Arrange
    const input = { context_window: { total_input_tokens: 1_000, used_percentage: 42.4 } };

    // Act
    const line = renderWith(null, input, PLAIN);

    // Assert
    assert.equal(line, '1.00k │ 42%');
  });

  test('prints the rate-limit usage and the time left', () => {
    // Arrange
    const input = { rate_limits: { five_hour: { used_percentage: 50, resets_at: NOW + 3_660 } } };

    // Act
    const line = renderWith(null, input, PLAIN);

    // Assert
    assert.equal(line, '5h 50% 1h 1m');
  });

  test('drops a rate-limit window past its reset', () => {
    // Arrange
    const input = { rate_limits: { seven_day: { used_percentage: 90, resets_at: NOW - 1 } } };

    // Act
    const line = renderWith(null, input, PLAIN);

    // Assert
    assert.equal(line, '');
  });

  test('renders an empty line for a null or non-object payload', () => {
    // Act
    const lines = [renderWith(null, null), renderWith(null, 'text'), renderWith(null, [])];

    // Assert
    assert.deepEqual(lines, ['', '', '']);
  });

  test('ignores a directory that is not a string', () => {
    // Act
    const line = renderWith(null, { cwd: 42, workspace: { current_dir: { path: '/x' } } }, PLAIN);

    // Assert
    assert.equal(line, '');
  });

  test('falls back to cwd when current_dir is empty', () => {
    // Arrange
    const input = { cwd: '/work/app', workspace: { current_dir: '' } };

    // Act
    const line = renderWith(null, input, PLAIN);

    // Assert
    assert.equal(line, 'app');
  });

  test('prefers current_dir over cwd', () => {
    // Arrange
    const input = { cwd: '/work/app', workspace: { current_dir: '/work/lib' } };

    // Act
    const line = renderWith(null, input, PLAIN);

    // Assert
    assert.equal(line, 'lib');
  });

  test('strips control characters from payload text', () => {
    // Arrange
    const input = { cwd: '/work/app', model: { display_name: `Mo${ESC}[2Jdel` } };

    // Act
    const line = renderWith(`ma${ESC}in`, input, PLAIN);

    // Assert
    assert.equal(line.includes(ESC), false);
    assert.ok(line.includes('git(main)'));
    assert.ok(line.includes('Mo[2Jdel'));
  });

  test('strips C1 characters and bidi overrides from payload text', () => {
    // Arrange
    const input = { cwd: '/work/a', model: { display_name: `Mo${CSI}d${BIDI}el` } };

    // Act
    const line = renderWith(null, input, PLAIN);

    // Assert
    assert.equal(line, 'a │ Model');
  });

  test('strips control characters from the directory and the effort level', () => {
    // Arrange
    const input = { cwd: `/work/ap${ESC}p`, effort: { level: `hi${ESC}gh` } };

    // Act
    const line = renderWith(null, input, PLAIN);

    // Assert
    assert.equal(line, 'app │ high');
  });
});
