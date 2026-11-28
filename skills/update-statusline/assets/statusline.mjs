/**
 * Claude Code status line.
 *
 * Reads the session JSON from stdin and prints one line:
 *   dir | branch | tokens / window (ctx%) / auto-compact (compact%) | model | effort | 5h % | 5h reset | 7d % | 7d reset
 * Segments whose data is unavailable are omitted.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const COLOR = {
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  orange: '\x1b[38;5;208m',
  red: '\x1b[31m',
  branch: '\x1b[38;5;205m',
  reset: '\x1b[0m'
};

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const MIN_COMPACT_WINDOW = 100_000;

/**
 * @param {string} text
 * @param {string[]} [styles]
 * @param {Record<string, string | undefined>} [env]
 * @returns {string}
 */
export function paint(text, styles = [], env = process.env) {
  if (env.NO_COLOR) {
    return text;
  }

  return `${styles.join('')}${text}${COLOR.reset}`;
}

/**
 * @param {unknown} value
 * @returns {value is number}
 */
function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, any>}
 */
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Drops C0/C1 control characters, bidi marks and overrides, and line separators so payload text cannot inject terminal escapes or reorder output.
 *
 * @param {unknown} value
 * @returns {string}
 */
function clean(value) {
  return [...String(value)]
    .filter((character) => {
      const code = character.codePointAt(0);

      const isControl = code <= 31 || (code >= 127 && code <= 159);
      const isBidiOrSeparator =
        (code >= 0x202a && code <= 0x202e) ||
        (code >= 0x2066 && code <= 0x2069) ||
        code === 0x200e ||
        code === 0x200f ||
        code === 0x061c ||
        code === 0x2028 ||
        code === 0x2029;

      return !isControl && !isBidiOrSeparator;
    })
    .join('');
}

/**
 * Formats a token count: 999, 1.23k, 12.3k, 123k, 1.23m, 12.3m.
 * Each tier is chosen on the rounded value so 9_999 renders as 10.0k, not 10.00k.
 *
 * @param {number} tokens
 * @returns {string}
 */
export function formatTokens(tokens) {
  const count = Math.round(tokens);
  if (count < 1_000) {
    return String(count);
  }

  const thousands = count / 1_000;
  if (Number(thousands.toFixed(2)) < 10) {
    return `${thousands.toFixed(2)}k`;
  }
  if (Number(thousands.toFixed(1)) < 100) {
    return `${thousands.toFixed(1)}k`;
  }
  if (Number(thousands.toFixed(0)) < 1_000) {
    return `${thousands.toFixed(0)}k`;
  }

  const millions = count / 1_000_000;
  if (Number(millions.toFixed(2)) < 10) {
    return `${millions.toFixed(2)}m`;
  }

  return `${millions.toFixed(1)}m`;
}

/**
 * @param {number} tokens
 * @returns {string}
 */
export function tokenColor(tokens) {
  if (tokens < 50_000) {
    return COLOR.green;
  }
  if (tokens < 100_000) {
    return COLOR.yellow;
  }
  if (tokens < 150_000) {
    return COLOR.orange;
  }

  return COLOR.red;
}

/**
 * @param {number} percentage
 * @returns {string}
 */
export function usageColor(percentage) {
  if (percentage < 35) {
    return COLOR.green;
  }
  if (percentage < 70) {
    return COLOR.yellow;
  }

  return COLOR.red;
}

/**
 * Formats time left until a reset as "Xd Yh Zm", "Yh Zm" or "Zm".
 * Days are only used when `allowDays` is set and more than a day remains.
 * Partial minutes round up so the countdown never shows 0m before the reset.
 *
 * @param {number} secondsLeft
 * @param {boolean} allowDays
 * @returns {string}
 */
export function formatTimeLeft(secondsLeft, allowDays) {
  const totalMinutes = Math.max(1, Math.ceil(secondsLeft / 60));

  if (allowDays && totalMinutes > MINUTES_PER_DAY) {
    const days = Math.floor(totalMinutes / MINUTES_PER_DAY);
    const hours = Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
    const minutes = totalMinutes % MINUTES_PER_HOUR;

    return `${days}d ${hours}h ${minutes}m`;
  }
  if (totalMinutes > MINUTES_PER_HOUR) {
    const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
    const minutes = totalMinutes % MINUTES_PER_HOUR;

    return `${hours}h ${minutes}m`;
  }

  return `${totalMinutes}m`;
}

/**
 * A missing git, a timeout, or a non-zero git exit means "no branch here".
 *
 * @param {any} error
 * @returns {boolean}
 */
function isGitUnavailable(error) {
  return error?.code === 'ENOENT' || error?.code === 'ETIMEDOUT' || typeof error?.status === 'number';
}

/**
 * @param {string | undefined} directory
 * @param {typeof execFileSync} [run]
 * @returns {string | null}
 */
export function gitBranch(directory, run = execFileSync) {
  if (!directory) {
    return null;
  }

  const git = (...args) =>
    run('git', ['-C', directory, '--no-optional-locks', ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 1_000
    }).trim();

  try {
    return git('symbolic-ref', '--short', 'HEAD');
  } catch (error) {
    if (!isGitUnavailable(error)) {
      throw error;
    }
  }

  try {
    return git('rev-parse', '--short', 'HEAD');
  } catch (error) {
    if (!isGitUnavailable(error)) {
      throw error;
    }

    return null;
  }
}

/**
 * Parses an integer with an optional k/m suffix (e.g. 200k, 1M).
 *
 * @param {unknown} value
 * @returns {number | null}
 */
function parseTokenCount(value) {
  if (isNumber(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }

  const match = /^\s*(\d+\.\d+|\d+)\s*([kKmM]?)\s*$/.exec(value);
  if (!match) {
    return null;
  }
  const multiplier = { '': 1, k: 1_000, m: 1_000_000 }[match[2].toLowerCase()];

  return Math.round(Number(match[1]) * multiplier);
}

/**
 * Reads `~/.claude/settings.json`; a missing or malformed file means "no settings".
 *
 * @param {Record<string, string | undefined>} env
 * @param {typeof readFileSync} run
 * @returns {Record<string, any>}
 */
function readSettings(env, run) {
  if (!env.HOME) {
    return {};
  }

  try {
    const settings = JSON.parse(run(join(env.HOME, '.claude', 'settings.json'), 'utf8'));

    return isObject(settings) ? settings : {};
  } catch (error) {
    if (error?.code !== 'ENOENT' && !(error instanceof SyntaxError)) {
      throw error;
    }

    return {};
  }
}

/**
 * The token count at which auto-compact triggers: the configured window capped at the context window,
 * the context window when none is configured, or null when auto-compact is off.
 *
 * @param {number | undefined} windowSize
 * @param {Record<string, string | undefined>} [env]
 * @param {typeof readFileSync} [run]
 * @returns {number | null}
 */
export function autoCompactLimit(windowSize, env = process.env, run = readFileSync) {
  const settings = readSettings(env, run);
  if (settings.autoCompactEnabled === false || env.DISABLE_AUTO_COMPACT === '1') {
    return null;
  }

  const known = isNumber(windowSize) && windowSize > 0 ? windowSize : null;
  let configured = parseTokenCount(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW);
  if (configured === null) {
    configured = parseTokenCount(settings.autoCompactWindow);
  }
  if (configured === null || configured < MIN_COMPACT_WINDOW) {
    return known;
  }

  return known === null ? configured : Math.min(configured, known);
}

/**
 * @param {{ used_percentage?: number, resets_at?: number } | undefined} window
 * @param {string} label
 * @param {boolean} allowDays
 * @param {number} nowSeconds
 * @param {(text: string, ...styles: string[]) => string} color
 * @returns {string[]}
 */
function rateLimitSegments(window, label, allowDays, nowSeconds, color) {
  const segments = [];

  // A window past its reset carries a stale percentage, so drop it entirely.
  if (isNumber(window?.resets_at) && window.resets_at <= nowSeconds) {
    return segments;
  }
  if (isNumber(window?.used_percentage)) {
    const percentage = window.used_percentage;
    segments.push(color(`${label} ${Math.round(percentage)}%`, COLOR.bold, usageColor(percentage)));
  }
  if (isNumber(window?.resets_at)) {
    segments.push(color(formatTimeLeft(window.resets_at - nowSeconds, allowDays), COLOR.dim));
  }

  return segments.length > 0 ? [segments.join(' ')] : segments;
}

/**
 * @param {Record<string, any>} input
 * @param {{ nowSeconds?: number, branch?: (directory: string | undefined) => string | null, env?: Record<string, string | undefined>, limit?: (windowSize: number | undefined) => number | null }} [options]
 * @returns {string}
 */
export function render(
  input,
  {
    nowSeconds = Date.now() / 1_000,
    branch = gitBranch,
    env = process.env,
    limit = (size) => autoCompactLimit(size, env)
  } = {}
) {
  const payload = isObject(input) ? input : {};
  const segments = [];
  const color = (text, ...styles) => paint(text, styles, env);
  const directory = [payload.workspace?.current_dir, payload.cwd].find(
    (candidate) => typeof candidate === 'string' && candidate !== ''
  );

  if (directory) {
    segments.push(color(clean(basename(directory)), COLOR.bold, COLOR.cyan));
  }

  const branchName = branch(directory);
  if (branchName) {
    segments.push(
      `${color('git(', COLOR.magenta)}${color(clean(branchName), COLOR.bold, COLOR.branch)}${color(')', COLOR.magenta)}`
    );
  }

  const contextWindow = isObject(payload.context_window) ? payload.context_window : {};
  const tokens = contextWindow.total_input_tokens;
  const windowSize = contextWindow.context_window_size;
  const compactLimit = limit(windowSize);

  let contextPercentage = contextWindow.used_percentage;
  if (!isNumber(contextPercentage) && isNumber(tokens) && windowSize > 0) {
    contextPercentage = (tokens / windowSize) * 100;
  }

  if (isNumber(tokens) || isNumber(windowSize) || isNumber(contextPercentage)) {
    const used = isNumber(tokens) ? tokens : 0;
    let text = formatTokens(used);
    if (isNumber(windowSize)) {
      text += ` / ${formatTokens(windowSize)}`;
    }
    if (isNumber(contextPercentage)) {
      text += ` (${Math.round(contextPercentage)}%)`;
    }
    let contextSegment = color(text, COLOR.bold, tokenColor(used));
    if (isNumber(compactLimit) && compactLimit > 0) {
      const compactPercentage = (used / compactLimit) * 100;
      const compactText = `${formatTokens(compactLimit)} (${Math.round(compactPercentage)}%)`;
      contextSegment += ` ${color('/', COLOR.dim)} ${color(compactText, COLOR.bold, usageColor(compactPercentage))}`;
    }
    segments.push(contextSegment);
  }

  if (payload.model?.display_name) {
    segments.push(color(clean(payload.model.display_name), COLOR.bold, COLOR.blue));
  }
  if (payload.effort?.level) {
    segments.push(color(clean(payload.effort.level), COLOR.dim));
  }

  const limits = [
    ...rateLimitSegments(payload.rate_limits?.five_hour, '5h', false, nowSeconds, color),
    ...rateLimitSegments(payload.rate_limits?.seven_day, '7d', true, nowSeconds, color)
  ];
  if (limits.length > 0) {
    segments.push(limits.join(' | '));
  }

  return segments.join(` ${color('│', COLOR.dim)} `);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input = {};
  try {
    input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
    // Render whatever is derivable from an empty payload rather than crash the status line.
  }
  process.stdout.write(render(input));
}
