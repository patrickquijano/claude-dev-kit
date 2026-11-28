// Classifies a failed release step and picks its handler: retry up to 2 times per class, then escalate with a short diagnosis.
// CLI: `failure-handlers.mjs <attempts> <command>` with the failure output on stdin prints `{class, action, handler, delayMs, diagnosis}`; exit 0.
import { readStdin, runIfMain } from '../../../../hooks/scripts/lib/hook-io.mjs';

export const RETRY_CAP = 2;
export const BACKOFF_MS = 2000;
const NETWORK =
  /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|Could not resolve host|rate limit|HTTP 5\d\d|\b50[234]\b/i;
const CODEQL = /code.?scanning|codeql/i;
const LINT = /\b(lint|format|eslint|prettier|markdownlint|yamllint|yamlfmt)\b/i;
const TEST = /\b(test|node --test)\b|^not ok\b|^# fail [1-9]/im;

// Handler per class: what the model does before the rerun; `commands` are exact, `rerun` is the check to repeat.
export const HANDLERS = {
  test: {
    steps:
      'decide whether the test is stale (the change is intended) or a regression; fix the code or re-point the test, never weaken it',
    commands: [],
    rerun: 'npm test'
  },
  lint: {
    steps: 'apply the formatter and eslint autofix, then review the diff',
    commands: ['npm run format', 'npx eslint . --fix'],
    rerun: 'npm run lint'
  },
  codeql: {
    steps: 'read the alerts (read-only), spawn a fix agent for each open alert on this branch, commit, and re-push',
    commands: ['gh api repos/{owner}/{repo}/code-scanning/alerts?ref={branch}&state=open'],
    rerun: 'gh pr checks'
  },
  network: {
    steps: 'wait out the backoff and repeat the same call unchanged',
    commands: [],
    rerun: 'the failed command'
  }
};

// Returns the failure class (`network`, `codeql`, `lint`, `test`, or `unknown`) from the failed command and its output.
export function classify({ command = '', output = '' } = {}) {
  if (NETWORK.test(output)) return 'network';
  if (CODEQL.test(command) || CODEQL.test(output)) return 'codeql';
  if (LINT.test(command)) return 'lint';
  if (TEST.test(command)) return 'test';
  if (LINT.test(output)) return 'lint';
  if (TEST.test(output)) return 'test';
  return 'unknown';
}

// First non-empty output line, capped, for the escalation diagnosis.
export const firstLine = (output) =>
  String(output)
    .split('\n')
    .find((l) => l.trim())
    ?.trim()
    .slice(0, 200) ?? 'no output';

// Backoff for the nth retry (0-based): doubles from BACKOFF_MS, only for the network class.
export const delayFor = (cls, attempts) => (cls === 'network' ? BACKOFF_MS * 2 ** attempts : 0);

// Decides retry or escalate for a failure after `attempts` earlier handler runs of the same class.
export function decide(failure, attempts) {
  if (!Number.isInteger(attempts) || attempts < 0) throw new RangeError('attempts must be a non-negative integer');
  const cls = classify(failure);
  if (cls === 'unknown' || attempts >= RETRY_CAP)
    return {
      class: cls,
      action: 'escalate',
      handler: null,
      delayMs: 0,
      diagnosis: `${cls} failure after ${attempts} handler attempt(s): ${firstLine(failure.output)}`
    };
  return { class: cls, action: 'retry', handler: HANDLERS[cls], delayMs: delayFor(cls, attempts), diagnosis: null };
}

// Returns a new `failures` counter with one more attempt for `cls`.
export const recordAttempt = (failures, cls) => ({ ...failures, [cls]: (failures[cls] ?? 0) + 1 });

// Runs the CLI: prints the decision for the failure on stdin and returns the exit code.
export async function run(argv, deps = { readStdin, stdout: (t) => process.stdout.write(t) }) {
  const [attempts, ...command] = argv;
  if (attempts === undefined || command.length === 0) return 2;
  const output = await deps.readStdin();
  deps.stdout(`${JSON.stringify(decide({ command: command.join(' '), output }, Number(attempts)))}\n`);
  return 0;
}

await runIfMain(import.meta.url, () => run(process.argv.slice(2)), { label: 'failure-handlers' });
