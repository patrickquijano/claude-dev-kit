// PreToolUse hook: blocks every tool while the reload marker lists a reload the user has not run, and blocks a Bash `git commit` before git runs when its header is over commitlint's limit or it bypasses hooks or signing (`.claude/rules/git.md`).
// An unparseable message is allowed through; commitlint still checks it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expected, projectDir, readJsonStdin, runIfMain } from '../../hooks/scripts/lib/hook-io.mjs';
import { markerPath, readMarker } from './lib/reload-marker.mjs';

const COMMIT = /\bgit\b[^;&|\n]*\bcommit\b/;
const MESSAGE_FLAG = /(?:^|\s)(?:-[a-zA-Z]*m|--message)(?:\s+|=)/;
const HEREDOC = /^\$\(cat +<<-?(['"]?)(\w+)\1 *\n/;
const BYPASS = [
  [/(?:^|\s)--no-verify(?:\s|$)/, '--no-verify'],
  [/(?:^|\s)--no-gpg-sign(?:\s|$)/, '--no-gpg-sign'],
  [/(?:^|[\s;&|])HUSKY=0(?:\s|$)/, 'HUSKY=0']
];

const defaults = {
  env: process.env,
  readFile: (path) => readFileSync(path, 'utf8'),
  readJsonStdin,
  stderr: (text) => process.stderr.write(text)
};

// Reads `header-max-length` from `.commitlintrc.json`; null when the file or rule is absent.
export function headerLimit(cwd, deps = defaults) {
  let text;
  try {
    text = deps.readFile(join(cwd, '.commitlintrc.json'));
  } catch (err) {
    if (!expected(err, 'ENOENT')) throw err;
    return null;
  }
  const limit = JSON.parse(text).rules?.['header-max-length']?.[2];
  return Number.isInteger(limit) && limit > 0 ? limit : null;
}

// Returns the value that follows a quote or heredoc opener, or null when it never closes.
function quoted(rest) {
  const quote = rest[0];
  if (quote !== '"' && quote !== "'") return rest.split(/\s/)[0];
  const body = rest.slice(1);
  const heredoc = HEREDOC.exec(body);
  if (heredoc) {
    const after = body.slice(heredoc[0].length);
    const lines = after.split('\n');
    const end = lines.findIndex((line) => line.trim() === heredoc[2]);
    return end === -1 ? null : lines.slice(0, end).join('\n');
  }
  for (let i = 0; i < body.length; i++) {
    if (quote === '"' && body[i] === '\\') i++;
    else if (body[i] === quote) return body.slice(0, i);
  }
  return null;
}

// First line of the first `-m` or `--message` value of a command; null when absent or unparseable.
export function commitHeader(command) {
  const flag = MESSAGE_FLAG.exec(command);
  if (!flag) return null;
  const rest = command.slice(flag.index + flag[0].length);
  const heredoc = HEREDOC.exec(rest);
  const value = heredoc ? quoted(`"${rest}`) : quoted(rest);
  if (value === null) return null;
  return (
    value
      .split('\n')
      .find((line) => line.trim() !== '')
      ?.trim() ?? null
  );
}

// Returns the reasons a Bash command must not run (empty for anything but a `git commit` that breaks a rule).
export function violations(command, limit) {
  if (typeof command !== 'string' || !COMMIT.test(command)) return [];
  const reasons = BYPASS.filter(([pattern]) => pattern.test(command)).map(([, name]) => `${name} is forbidden`);
  const header = limit ? commitHeader(command) : null;
  if (header && header.length > limit) reasons.push(`commit header is ${header.length} chars, max ${limit}`);
  return reasons;
}

// Explains a pending reload: the files, the command that clears it, and the manual unlock.
export function gateMessage(entries, path) {
  const files = [...new Set(entries.map((e) => e.file))].join(', ');
  const commands = [...new Set(entries.map((e) => e.command))].join(' or ');
  return `cdk pre-tool-use: tools blocked until a reload: ${files} changed. Ask the user to run ${commands} (add --force if it is skipped), or to run \`! rm ${path}\` to unlock.\n`;
}

// Returns the exit code: 2 when a reload is pending or the commit must not run, else 0.
export async function main(deps = defaults) {
  const event = await deps.readJsonStdin();
  const path = markerPath(event.session_id, deps.tmp);
  const pending = readMarker(path, deps.marker);
  if (pending.length > 0) {
    deps.stderr(gateMessage(pending, path));
    return 2;
  }
  if (event.tool_name !== undefined && event.tool_name !== 'Bash') return 0;
  const command = event.tool_input?.command;
  if (typeof command !== 'string' || !COMMIT.test(command)) return 0;
  const cwd = projectDir(event, { env: deps.env, ...(deps.realpath && { realpath: deps.realpath }) });
  const reasons = violations(command, headerLimit(cwd, deps));
  if (reasons.length === 0) return 0;
  deps.stderr(`cdk pre-tool-use: git commit blocked: ${reasons.join('; ')} (.claude/rules/git.md)\n`);
  return 2;
}

// A gate fails closed: an unexpected error exits 2 so Claude sees it.
await runIfMain(import.meta.url, main, { label: 'pre-tool-use (commit gate)', failCode: 2 });
