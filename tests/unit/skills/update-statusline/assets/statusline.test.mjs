import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  autoCompactLimit,
  effortColor,
  formatTimeLeft,
  formatTokens,
  gitBranch,
  gitDirty,
  gradientColor,
  modelColor,
  paint,
  render,
  tokenColor
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

const renderWith = (name, input = INPUT, env = {}, limit = () => null, dirty = () => false) =>
  render(input, { nowSeconds: NOW, branch: () => name, dirty, env, limit });

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

  test('keeps the git:( and ) wrapper in its own color', () => {
    // Act
    const line = renderWith('main');

    // Assert
    assert.ok(line.includes(`${MAGENTA}git:(${RESET}`));
    assert.ok(line.includes(`${MAGENTA})${RESET}`));
  });

  test('marks a dirty working tree with a yellow cross after the wrapper', () => {
    // Act
    const line = renderWith(
      'main',
      INPUT,
      {},
      () => null,
      () => true
    );

    // Assert
    assert.ok(line.includes(`${MAGENTA})${RESET} ${YELLOW}✗${RESET}`));
  });

  test('prints no cross for a clean working tree', () => {
    // Act
    const line = renderWith('main', INPUT, PLAIN);

    // Assert
    assert.equal(line.includes('✗'), false);
  });

  test('prints no escapes when NO_COLOR is set', () => {
    // Act
    const line = renderWith('main', INPUT, PLAIN);

    // Assert
    assert.equal(line.includes(ESC), false);
    assert.ok(line.includes('git:(main)'));
  });

  test('omits the branch segment without a branch', () => {
    // Act
    const line = renderWith(null);

    // Assert
    assert.equal(line.includes('git:('), false);
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

  test('prints millions with two or one decimals and trims trailing zeros', () => {
    // Act
    const texts = [formatTokens(1_234_567), formatTokens(12_345_678)];

    // Assert
    assert.deepEqual(texts, ['1.23M', '12.3M']);
  });

  test('chooses the tier on the rounded value', () => {
    // Act
    const texts = [formatTokens(9_999), formatTokens(999_999)];

    // Assert
    assert.deepEqual(texts, ['10.0k', '1M']);
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

describe('gradientColor', () => {
  test('returns the green and red end stops at 0 and 100', () => {
    // Act
    const colors = [gradientColor(0), gradientColor(100)];

    // Assert
    assert.deepEqual(colors, [`${ESC}[38;2;64;192;87m`, `${ESC}[38;2;225;70;60m`]);
  });

  test('returns the yellow and orange stops at a third and two thirds', () => {
    // Act
    const colors = [gradientColor(100 / 3), gradientColor(200 / 3)];

    // Assert
    assert.deepEqual(colors, [`${ESC}[38;2;232;190;40m`, `${ESC}[38;2;240;130;40m`]);
  });

  test('blends between two stops', () => {
    // Act
    const color = gradientColor(100 / 6);

    // Assert
    assert.equal(color, `${ESC}[38;2;148;191;64m`);
  });

  test('clamps values outside 0..100', () => {
    // Act
    const colors = [gradientColor(-20), gradientColor(250)];

    // Assert
    assert.deepEqual(colors, [gradientColor(0), gradientColor(100)]);
  });
});

describe('modelColor', () => {
  test('maps each known family to its color regardless of case', () => {
    // Act
    const colors = [modelColor('Opus 5.5'), modelColor('claude-SONNET'), modelColor('Haiku')];

    // Assert
    assert.deepEqual(colors, [`${ESC}[38;2;167;139;250m`, `${ESC}[38;2;96;165;250m`, `${ESC}[38;2;45;212;191m`]);
  });

  test('keeps an unknown family blue', () => {
    // Act
    const colors = [modelColor('Model'), modelColor('')];

    // Assert
    assert.deepEqual(colors, [BLUE, BLUE]);
  });
});

describe('effortColor', () => {
  test('maps each known level to a distinct gradient color', () => {
    // Act
    const colors = ['low', 'medium', 'high', 'xhigh', 'max'].map(effortColor);

    // Assert
    assert.deepEqual(colors, [0, 25, 50, 75, 100].map(gradientColor));
  });

  test('falls back to dim for an unknown level, including inherited property names', () => {
    // Act
    const colors = [effortColor('turbo'), effortColor('toString')];

    // Assert
    assert.deepEqual(colors, [`${ESC}[2m`, `${ESC}[2m`]);
  });
});

describe('formatTimeLeft', () => {
  test('prints minutes only under an hour, flooring partial minutes', () => {
    // Act
    const texts = [formatTimeLeft(59, false), formatTimeLeft(61, false), formatTimeLeft(3_599, false)];

    // Assert
    assert.deepEqual(texts, ['0m left', '1m left', '59m left']);
  });

  test('prints hours and minutes from an hour', () => {
    // Act
    const texts = [formatTimeLeft(3_600, false), formatTimeLeft(3_660, false)];

    // Assert
    assert.deepEqual(texts, ['1h 0m left', '1h 1m left']);
  });

  test('prints days only when allowed and at least a day remains', () => {
    // Act
    const texts = [formatTimeLeft(90_060, true), formatTimeLeft(90_060, false), formatTimeLeft(86_399, true)];

    // Assert
    assert.deepEqual(texts, ['1d 1h 1m left', '25h 1m left', '23h 59m left']);
  });

  test('clamps a negative or zero time to zero minutes', () => {
    // Act
    const texts = [formatTimeLeft(0, false), formatTimeLeft(-50, true)];

    // Assert
    assert.deepEqual(texts, ['0m left', '0m left']);
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

describe('gitDirty', () => {
  test('returns true when git status lists changes', () => {
    // Arrange
    const run = () => ' M file.txt\n';

    // Act
    const dirty = gitDirty('/work/app', run);

    // Assert
    assert.equal(dirty, true);
  });

  test('returns false for a clean tree', () => {
    // Arrange
    const run = () => '\n';

    // Act
    const dirty = gitDirty('/work/app', run);

    // Assert
    assert.equal(dirty, false);
  });

  test('returns false without a directory', () => {
    // Arrange
    const run = () => {
      throw new Error('must not run');
    };

    // Act
    const dirty = gitDirty(undefined, run);

    // Assert
    assert.equal(dirty, false);
  });

  test('returns false when git is missing, times out, or exits non-zero', () => {
    // Arrange
    const failing = (error) => () => {
      throw Object.assign(new Error('git failed'), error);
    };

    // Act
    const results = [
      gitDirty('/work/app', failing({ code: 'ENOENT' })),
      gitDirty('/work/app', failing({ code: 'ETIMEDOUT' })),
      gitDirty('/work/app', failing({ status: 128 }))
    ];

    // Assert
    assert.deepEqual(results, [false, false, false]);
  });

  test('rethrows an unexpected error', () => {
    // Arrange
    const run = () => {
      throw Object.assign(new Error('denied'), { code: 'EACCES' });
    };

    // Act
    const act = () => gitDirty('/work/app', run);

    // Assert
    assert.throws(act, { code: 'EACCES' });
  });
});

describe('autoCompactLimit', () => {
  const settingsFile = (settings) => () => JSON.stringify(settings);
  const missing = () => {
    throw Object.assign(new Error('missing'), { code: 'ENOENT' });
  };

  test('caps the configured window at the context window', () => {
    // Act
    const limit = autoCompactLimit(1_000_000, { HOME: '/h', CLAUDE_CODE_AUTO_COMPACT_WINDOW: '200k' }, missing);

    // Assert
    assert.equal(limit, 200_000);
  });

  test('reads the window from settings.json and accepts a suffix', () => {
    // Act
    const limit = autoCompactLimit(1_000_000, { HOME: '/h' }, settingsFile({ autoCompactWindow: '0.5m' }));

    // Assert
    assert.equal(limit, 500_000);
  });

  test('falls back to the context window when none is configured', () => {
    // Act
    const limit = autoCompactLimit(400_000, { HOME: '/h' }, missing);

    // Assert
    assert.equal(limit, 400_000);
  });

  test('falls back to the context window when the configured one is below the minimum', () => {
    // Act
    const limit = autoCompactLimit(400_000, { HOME: '/h', CLAUDE_CODE_AUTO_COMPACT_WINDOW: '50k' }, missing);

    // Assert
    assert.equal(limit, 400_000);
  });

  test('returns null when auto-compact is disabled in settings', () => {
    // Act
    const limit = autoCompactLimit(400_000, { HOME: '/h' }, settingsFile({ autoCompactEnabled: false }));

    // Assert
    assert.equal(limit, null);
  });

  test('returns null when DISABLE_AUTO_COMPACT is 1', () => {
    // Act
    const limit = autoCompactLimit(400_000, { HOME: '/h', DISABLE_AUTO_COMPACT: '1' }, missing);

    // Assert
    assert.equal(limit, null);
  });

  test('returns null with no window size and nothing configured', () => {
    // Act
    const limit = autoCompactLimit(undefined, { HOME: '/h' }, missing);

    // Assert
    assert.equal(limit, null);
  });

  test('uses the configured window when the context window is unknown', () => {
    // Act
    const limit = autoCompactLimit(undefined, { HOME: '/h', CLAUDE_CODE_AUTO_COMPACT_WINDOW: '300000' }, missing);

    // Assert
    assert.equal(limit, 300_000);
  });

  test('treats invalid settings JSON as no settings', () => {
    // Act
    const limit = autoCompactLimit(400_000, { HOME: '/h' }, () => '{not json');

    // Assert
    assert.equal(limit, 400_000);
  });

  test('skips settings when HOME is unset', () => {
    // Arrange
    const run = () => {
      throw new Error('must not read');
    };

    // Act
    const limit = autoCompactLimit(400_000, {}, run);

    // Assert
    assert.equal(limit, 400_000);
  });

  test('rethrows an unexpected read error', () => {
    // Arrange
    const run = () => {
      throw Object.assign(new Error('denied'), { code: 'EACCES' });
    };

    // Act
    const act = () => autoCompactLimit(400_000, { HOME: '/h' }, run);

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
    assert.equal(line, '12.3k / 100k (12%)');
  });

  test('prefers the reported context percentage', () => {
    // Arrange
    const input = { context_window: { total_input_tokens: 1_000, used_percentage: 42.4 } };

    // Act
    const line = renderWith(null, input, PLAIN);

    // Assert
    assert.equal(line, '1.00k (42%)');
  });

  test('prints the auto-compact window with its percentage after the context window', () => {
    // Arrange
    const input = { context_window: { total_input_tokens: 120_000, context_window_size: 1_000_000 } };

    // Act
    const line = renderWith(null, input, PLAIN, () => 200_000);

    // Assert
    assert.equal(line, '120k / 1M (12%) / 200k (60%)');
  });

  test('colors the auto-compact percentage with the gradient at its own percentage', () => {
    // Arrange
    const at = (tokens) => ({ context_window: { total_input_tokens: tokens, context_window_size: 1_000_000 } });

    // Act
    const low = renderWith(null, at(20_000), {}, () => 200_000);
    const high = renderWith(null, at(180_000), {}, () => 200_000);

    // Assert
    assert.ok(low.endsWith(`${BOLD}${gradientColor(10)}200k (10%)${RESET}`));
    assert.ok(high.endsWith(`${BOLD}${gradientColor(90)}200k (90%)${RESET}`));
  });

  test('colors the context part with the gradient at the context percentage', () => {
    // Arrange
    const input = { context_window: { total_input_tokens: 500_000, context_window_size: 1_000_000 } };

    // Act
    const line = renderWith(null, input);

    // Assert
    assert.equal(line, `${BOLD}${gradientColor(50)}500k / 1M (50%)${RESET}`);
  });

  test('omits the auto-compact part when the limit is unavailable', () => {
    // Arrange
    const input = { context_window: { total_input_tokens: 4_000, context_window_size: 200_000 } };

    // Act
    const line = renderWith(null, input, PLAIN, () => null);

    // Assert
    assert.equal(line, '4.00k / 200k (2%)');
  });

  test('prints the zero-token context and the limit when only the limit is known', () => {
    // Act
    const line = renderWith(null, {}, PLAIN, () => 200_000);

    // Assert
    assert.equal(line, '0 / 200k (0%)');
  });

  test('prints a zero limit without a percentage', () => {
    // Act
    const line = renderWith(null, {}, PLAIN, () => 0);

    // Assert
    assert.equal(line, '0 / 0');
  });

  test('prints nothing for the context when no context data exists', () => {
    // Act
    const line = renderWith(null, {}, PLAIN);

    // Assert
    assert.equal(line, '');
  });

  test('prints the prefix of the line before the auto-compact part separated by a dim slash', () => {
    // Arrange
    const input = { context_window: { total_input_tokens: 10_000, context_window_size: 100_000 } };

    // Act
    const line = renderWith(null, input, {}, () => 100_000);

    // Assert
    assert.ok(line.includes(`${RESET} ${ESC}[2m/${RESET} `));
  });

  test('prints the rate-limit usage and the time left', () => {
    // Arrange
    const input = { rate_limits: { five_hour: { used_percentage: 50, resets_at: NOW + 3_660 } } };

    // Act
    const line = renderWith(null, input, PLAIN);

    // Assert
    assert.equal(line, '5h - 50% - 1h 1m left');
  });

  test('prints both rate-limit windows separated by a bar', () => {
    // Arrange
    const input = {
      rate_limits: {
        five_hour: { used_percentage: 10, resets_at: NOW + 600 },
        seven_day: { used_percentage: 20, resets_at: NOW + 90_000 }
      }
    };

    // Act
    const line = renderWith(null, input, PLAIN);

    // Assert
    assert.equal(line, '5h - 10% - 10m left │ 7d - 20% - 1d 1h 0m left');
  });

  test('colors the time left by the share of the window that remains', () => {
    // Arrange
    const input = { rate_limits: { five_hour: { used_percentage: 50, resets_at: NOW + 9_000 } } };

    // Act
    const line = renderWith(null, input);

    // Assert
    assert.ok(line.includes(`${BOLD}${gradientColor(50)}50%${RESET}`));
    assert.ok(line.includes(`${gradientColor(50)}2h 30m left${RESET}`));
  });

  test('colors the model by family and the effort by level', () => {
    // Arrange
    const input = { model: { display_name: 'Opus 5.5' }, effort: { level: 'max' } };

    // Act
    const line = renderWith(null, input);

    // Assert
    assert.equal(line, `${BOLD}${modelColor('Opus 5.5')}Opus 5.5${RESET} ${gradientColor(100)}max${RESET}`);
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

  test('prints no directory when current_dir is empty', () => {
    // Arrange
    const input = { cwd: '/work/app', workspace: { current_dir: '' } };

    // Act
    const line = renderWith(null, input, PLAIN);

    // Assert
    assert.equal(line, '');
  });

  test('falls back to cwd when current_dir is absent', () => {
    // Arrange
    const input = { cwd: '/work/app', workspace: {} };

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
    assert.ok(line.includes('git:(main)'));
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

  test('strips every bidi and separator code point at the range edges', () => {
    // Arrange
    const stripped = [0x200e, 0x200f, 0x061c, 0x2028, 0x2029, 0x202a, 0x202e, 0x2066, 0x2069];
    const input = {
      cwd: '/work/a',
      model: { display_name: `M${stripped.map((code) => String.fromCodePoint(code)).join('')}x` }
    };

    // Act
    const line = renderWith(null, input, PLAIN);

    // Assert
    assert.equal(line, 'a │ Mx');
  });

  test('keeps characters just outside the bidi ranges', () => {
    // Arrange
    const kept = [0x200d, 0x2027, 0x202f, 0x2065, 0x206a].map((code) => String.fromCodePoint(code)).join('');
    const input = { cwd: '/work/a', model: { display_name: `M${kept}x` } };

    // Act
    const line = renderWith(null, input, PLAIN);

    // Assert
    assert.equal(line, `a │ M${kept}x`);
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
