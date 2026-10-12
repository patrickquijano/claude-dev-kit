// End-of-task logic for the UserPromptSubmit dispatcher (user-prompt-submit.mjs): tell Claude what to do once the whole
// task is done (refresh the Graphify graph, then group, commit, and push this task's changes). Context only, no state.
import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { git, unsafeState } from './git-state.mjs';
import { graphifyConfigured, graphifyFilesExist } from './graphify.mjs';

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
const COMMIT = `${STATUS} If this task created, edited, or deleted files, invoke the \`cdk:commit-changes\` skill via the Skill tool with the argument \`paths: <the files this task created, edited, or deleted>\` to group them atomically and logically, commit, and push; files that were already dirty before this task stay out. If this task changed no files, skip this step.`;

const QUESTION_WORDS = /^(what|why|how|where|when|which|who|is|are|can|could|does|do|should|explain)\b/i;
const listItems = (text) => (text.match(/^\s*(?:[-*+]|\d+[.)])\s+\S/gm) || []).length;

// A question changes no files; #plan and #noplan force the steps.
const isQuestion = (prompt) => {
  const text = prompt.trim();
  if (/(^|\s)#(no)?plan\b/.test(text)) return false;
  return (QUESTION_WORDS.test(text) || text.endsWith('?')) && listItems(text) < 3;
};

// Ordered end-of-task steps for a prompt; empty when none apply.
export function decide(input, deps = realDeps) {
  const prompt = input?.prompt;
  if (typeof prompt !== 'string' || !prompt.trim() || /^\s*[/!]/.test(prompt)) return [];
  if (isQuestion(prompt)) return [];
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
