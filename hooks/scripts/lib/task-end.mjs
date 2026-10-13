// End-of-task logic for the UserPromptSubmit dispatcher (user-prompt-submit.mjs): tell Claude what to do once the whole
// task is done (run the unit tests, refresh the Graphify graph, add changelog entries, update docs, then group, commit, and push this task's
// changes). Context only, no state.
import { existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { git, shipReleaseMarker, unsafeState } from './git-state.mjs';
import { graphifyConfigured, graphifyFilesExist } from './graphify.mjs';
import { contextOutput, projectDir } from './hook-io.mjs';
import { NOPLAN_RE, PLAN_RE, isSkippedPrompt } from './prompt.mjs';
import { unitTestCommand } from './unit-tests.mjs';

// Side effects as a swappable bundle so tests never touch git, graphify, or the fs.
export const realDeps = {
  git,
  unsafeState,
  graphifyConfigured,
  graphifyFilesExist,
  unitTestCommand,
  existsSync,
  realpathSync,
  env: process.env,
  cwd: () => process.cwd()
};

const STATUS = 'Run `git status --porcelain`.';
const unitTests = (cmd) =>
  `${STATUS} If this task changed code files (not only docs or config), run the unit tests with \`${cmd}\` (or the unit-test command CLAUDE.md documents, if different); on failure find the root cause, fix it, and re-run until they pass. Run integration and e2e suites only when asked or when the change touches their boundary.`;
const GRAPHIFY_UPDATE = `${STATUS} If this task changed code files (not only docs or config), run \`graphify update .\` so the knowledge graph matches the code.`;
const GRAPHIFY_BUILD = `${STATUS} If this task changed code files (not only docs or config), invoke the \`graphify\` skill with the argument \`.\` via the Skill tool to build the knowledge graph.`;
const CHANGELOG = `${STATUS} If this task changed user-facing behavior (skills, agents, hooks, commands, or anything CHANGELOG.md covers), invoke the \`cdk:write-changelog\` skill via the Skill tool to add entries under Unreleased; never cut a release or bump the version. Otherwise skip this step.`;
const DOCS = `${STATUS} If this task changed behavior, commands, paths, or components that README.md or related docs (CLAUDE.md, .claude/rules, skill references) describe, update them so they match; otherwise skip this step.`;
const COMMIT = `${STATUS} If this task created, edited, or deleted files, invoke the \`cdk:commit-changes\` skill via the Skill tool with the argument \`paths: <the files this task created, edited, or deleted>\` to group them atomically and logically, commit, and push; files that were already dirty before this task stay out. If this task changed no files, skip this step.`;

const QUESTION_WORDS = /^(what|why|how|where|when|which|who|is|are|can|could|does|do|should|explain)\b/i;
const listItems = (text) => (text.match(/^\s*(?:[-*+]|\d+[.)])\s+\S/gm) || []).length;

// A question changes no files; #plan and #noplan force the steps.
const isQuestion = (prompt) => {
  const text = prompt.trim();
  if (PLAN_RE.test(text) || NOPLAN_RE.test(text)) return false;
  return (QUESTION_WORDS.test(text) || text.endsWith('?')) && listItems(text) < 3;
};

// Ordered end-of-task steps for a prompt; empty when none apply.
export function decide(input, deps = realDeps) {
  const prompt = input?.prompt;
  if (typeof prompt !== 'string' || !prompt.trim() || isSkippedPrompt(prompt)) return [];
  if (isQuestion(prompt)) return [];
  const cwd = projectDir(input, { env: deps.env, cwd: deps.cwd, realpath: deps.realpathSync });
  const parts = [];
  const testCmd = deps.unitTestCommand(cwd);
  if (testCmd) parts.push(unitTests(testCmd));
  if (deps.graphifyConfigured(cwd)) parts.push(deps.graphifyFilesExist(cwd) ? GRAPHIFY_UPDATE : GRAPHIFY_BUILD);
  const inside = deps.git(cwd, ['rev-parse', '--is-inside-work-tree']);
  if (inside.status !== 0) return parts;
  // /cdk:ship-release owns its commits while its marker exists.
  if (shipReleaseMarker(cwd, deps.git, deps.existsSync)) return parts;
  if (!deps.unsafeState(cwd)) {
    if (deps.existsSync(join(cwd, 'CHANGELOG.md'))) parts.push(CHANGELOG);
    parts.push(DOCS, COMMIT);
  }
  return parts;
}

// The hook's JSON output for the steps, or null when there are none.
export function output(parts) {
  if (!parts.length) return null;
  const steps = parts.map((p, i) => `${i + 1}. ${p}`).join('\n');
  return contextOutput(
    'UserPromptSubmit',
    `After the whole task is complete (not before, not mid-task), as the final steps:\n${steps}`
  );
}
