/**
 * Claude Code status line.
 *
 * Reads the session JSON from stdin and prints one line:
 *   dir | branch | tokens | ctx% | model | effort | 5h % | 5h reset | 7d % | 7d reset
 * Segments whose data is unavailable are omitted.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
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

/**
 * @param {string} text
 * @param {...string} styles
 * @returns {string}
 */
export function paint(text, ...styles) {
  if (process.env.NO_COLOR) {
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
 * @param {string | undefined} directory
 * @returns {string | null}
 */
function gitBranch(directory) {
  if (!directory) {
    return null;
  }

  const git = (...args) =>
    execFileSync('git', ['-C', directory, '--no-optional-locks', ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 1_000
    }).trim();

  try {
    return git('symbolic-ref', '--short', 'HEAD');
  } catch {
    try {
      return git('rev-parse', '--short', 'HEAD');
    } catch {
      return null;
    }
  }
}

/**
 * @param {{ used_percentage?: number, resets_at?: number } | undefined} window
 * @param {string} label
 * @param {boolean} allowDays
 * @param {number} nowSeconds
 * @returns {string[]}
 */
function rateLimitSegments(window, label, allowDays, nowSeconds) {
  const segments = [];

  // A window past its reset carries a stale percentage, so drop it entirely.
  if (isNumber(window?.resets_at) && window.resets_at <= nowSeconds) {
    return segments;
  }
  if (isNumber(window?.used_percentage)) {
    const percentage = window.used_percentage;
    segments.push(paint(`${label} ${Math.round(percentage)}%`, COLOR.bold, usageColor(percentage)));
  }
  if (isNumber(window?.resets_at)) {
    segments.push(paint(formatTimeLeft(window.resets_at - nowSeconds, allowDays), COLOR.dim));
  }

  return segments.length > 0 ? [segments.join(' ')] : segments;
}

/**
 * @param {Record<string, any>} input
 * @param {{ nowSeconds?: number, branch?: (directory: string | undefined) => string | null }} [options]
 * @returns {string}
 */
export function render(input, { nowSeconds = Date.now() / 1_000, branch = gitBranch } = {}) {
  const segments = [];
  const directory = input.workspace?.current_dir ?? input.cwd;

  if (directory) {
    segments.push(paint(basename(directory), COLOR.bold, COLOR.cyan));
  }

  const branchName = branch(directory);
  if (branchName) {
    segments.push(
      `${paint('git(', COLOR.magenta)}${paint(branchName, COLOR.bold, COLOR.branch)}${paint(')', COLOR.magenta)}`
    );
  }

  const contextWindow = input.context_window ?? {};
  const tokens = contextWindow.total_input_tokens;
  if (isNumber(tokens)) {
    segments.push(paint(formatTokens(tokens), COLOR.bold, tokenColor(tokens)));
  }

  let contextPercentage = contextWindow.used_percentage;
  if (!isNumber(contextPercentage) && isNumber(tokens) && contextWindow.context_window_size > 0) {
    contextPercentage = (tokens / contextWindow.context_window_size) * 100;
  }
  if (isNumber(contextPercentage)) {
    segments.push(paint(`${Math.round(contextPercentage)}%`, tokenColor(tokens ?? 0)));
  }

  if (input.model?.display_name) {
    segments.push(paint(input.model.display_name, COLOR.bold, COLOR.blue));
  }
  if (input.effort?.level) {
    segments.push(paint(input.effort.level, COLOR.dim));
  }

  const limits = [
    ...rateLimitSegments(input.rate_limits?.five_hour, '5h', false, nowSeconds),
    ...rateLimitSegments(input.rate_limits?.seven_day, '7d', true, nowSeconds)
  ];
  if (limits.length > 0) {
    segments.push(limits.join(' | '));
  }

  return segments.join(` ${paint('│', COLOR.dim)} `);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input = {};
  try {
    input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    // Render whatever is derivable from an empty payload rather than crash the status line.
  }
  process.stdout.write(render(input));
}
