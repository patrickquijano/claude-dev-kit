// End-of-task logic for the UserPromptSubmit dispatcher (user-prompt-submit.mjs): tell Claude what to do once the whole
// task is done (refresh the Graphify graph, then group, commit, and push this task's changes). Context only, no state.
import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { git, unsafeState } from './git-state.mjs';
import { graphifyConfigured, graphifyFilesExist } from './graphify.mjs';
import { classify } from './plan-mode.mjs';

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

const STATUS = 'Run `git status --porcelain`.';
const GRAPHIFY_UPDATE = `${STATUS} If this task changed code files (not only docs or config), run \`graphify update .\` so the knowledge graph matches the code.`;
const GRAPHIFY_BUILD = `${STATUS} If this task changed code files (not only docs or config), invoke the \`graphify\` skill with the argument \`.\` via the Skill tool to build the knowledge graph.`;
const COMMIT = `${STATUS} If this task changed files, invoke the \`cdk:commit-changes\` skill via the Skill tool to group the changes atomically and logically, commit, and push; leave changes that existed before this task alone.`;

// Ordered end-of-task steps for a prompt; empty when none apply.
export function decide(input, deps = realDeps) {
  const prompt = input?.prompt;
  if (typeof prompt !== 'string' || !prompt.trim() || /^\s*[/!]/.test(prompt)) return [];
  // A question changes no files.
  if (classify(prompt).rule === 'question') return [];
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
