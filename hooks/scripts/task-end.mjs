// UserPromptSubmit hook: tell Claude what to do once the whole task is done (refresh the Graphify graph, then group,
// commit, and push this task's changes). Context only; always exits 0, keeps no state, and skips `/` and `!` prompts.
import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { git, unsafeState } from './git-state.mjs';
import { graphifyConfigured, graphifyFilesExist } from './graphify.mjs';
import { readStdin } from './tools.mjs';

// Side effects as a swappable bundle so tests never touch git, graphify, or the fs.
export const realDeps = {
  git,
  unsafeState,
  graphifyConfigured,
  graphifyFilesExist,
  existsSync,
  realpathSync,
  env: process.env,
  cwd: () => process.cwd()
};

const GRAPHIFY_UPDATE = 'Run `graphify update .` so the knowledge graph matches the code.';
const GRAPHIFY_BUILD =
  'Invoke the `graphify` skill with the argument `.` via the Skill tool to build the knowledge graph.';
const COMMIT =
  'If this task changed files, invoke the `cdk:commit-changes` skill via the Skill tool to group the changes atomically and logically, commit, and push; leave changes that existed before this task alone.';

// Ordered end-of-task steps for a prompt; empty when none apply.
export function decide(input, deps = realDeps) {
  const prompt = input?.prompt;
  if (typeof prompt !== 'string' || !prompt.trim() || /^\s*[/!]/.test(prompt)) return [];
  let cwd;
  try {
    cwd = deps.realpathSync(deps.env.CLAUDE_PROJECT_DIR || input.cwd || deps.cwd());
  } catch {
    return [];
  }
  const parts = [];
  if (deps.graphifyConfigured(cwd)) parts.push(deps.graphifyFilesExist(cwd) ? GRAPHIFY_UPDATE : GRAPHIFY_BUILD);
  const inside = deps.git(cwd, ['rev-parse', '--is-inside-work-tree']);
  if (inside.status !== 0) return parts;
  // /cdk:ship-release owns its commits while its marker exists.
  const hold = deps.git(cwd, ['rev-parse', '--git-path', 'cdk-ship-release']);
  if (hold.status === 0 && deps.existsSync(path.resolve(cwd, hold.stdout.toString().trim()))) return parts;
  if (!deps.unsafeState(cwd)) parts.push(COMMIT);
  return parts;
}

// The hook's JSON output for the steps, or null when there are none.
export function output(parts) {
  if (!parts.length) return null;
  const steps = parts.map((p, i) => `${i + 1}. ${p}`).join('\n');
  return {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: `After the whole task is complete (not before, not mid-task), as the final steps:\n${steps}`
    }
  };
}

async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    return;
  }
  const out = output(decide(input));
  if (out) process.stdout.write(JSON.stringify(out));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch {
    // A hook must never fail the turn.
  }
}
