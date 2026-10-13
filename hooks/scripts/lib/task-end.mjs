// End-of-task logic for the UserPromptSubmit dispatcher (user-prompt-submit.mjs): tell Claude what to do once the whole
// task is done (run the unit tests, refresh the Graphify graph, add changelog entries, update docs, then group, commit, and push this task's
// changes; the changelog and commit steps ask the user first). Every step is injected on every prompt; one is left out only when it cannot run (no test command, no graphify
// binary, no git, unsafe git state, ship-release marker for the commit). Context only, no state.
import { existsSync, realpathSync } from 'node:fs';
import { git, shipReleaseMarker, unsafeState } from './git-state.mjs';
import { graphifyConfigured, graphifyFilesExist, which } from './graphify.mjs';
import { contextOutput, projectDir } from './hook-io.mjs';
import { unitTestCommand } from './unit-tests.mjs';

// Side effects as a swappable bundle so tests never touch git, graphify, or the fs.
export const realDeps = {
  git,
  unsafeState,
  graphifyInstalled: () => Boolean(which('graphify')),
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
const GRAPHIFY_SETUP = `${STATUS} If this task changed code files (not only docs or config) and \`graphify-out/\` is missing, suggest \`/cdk:setup-graphify\` to the user; do not build the graph yourself.`;
const ask = (topic, run, lean) =>
  `first ask the user with AskUserQuestion whether to ${topic}: options "${run}" and "Skip"; put the one you recommend first and end its label with "(Recommended)", and give each option a one-line reason grounded in this task's changes. ${lean} On "${run}",`;
const CHANGELOG = `${STATUS} If this task changed user-facing behavior (skills, agents, hooks, commands, or anything CHANGELOG.md covers), ${ask('update the changelog', 'Update changelog', 'Lean Skip when the change is internal only or Unreleased already covers it.')} invoke the \`cdk:write-changelog\` skill via the Skill tool to add entries under Unreleased; never cut a release or bump the version. On "Skip", or when nothing user-facing changed, skip this step.`;
const DOCS = `${STATUS} If this task changed behavior, commands, paths, or components that README.md or related docs (CLAUDE.md, .claude/rules, skill references) describe, update them so they match; otherwise skip this step.`;
const COMMIT = `${STATUS} If this task created, edited, or deleted files, ${ask('commit and push them', 'Commit and push', 'Lean Skip when the work is unfinished, a check still fails, or the user said not to commit.')} invoke the \`cdk:commit-changes\` skill via the Skill tool with the argument \`paths: <the files this task created, edited, or deleted>\` to group them atomically and logically, commit, and push; files that were already dirty before this task stay out. On "Skip", or if this task changed no files, skip this step.`;

// Ordered end-of-task steps for a prompt; empty when none apply.
export function decide(input, deps = realDeps) {
  const prompt = input?.prompt;
  if (typeof prompt !== 'string' || !prompt.trim()) return [];
  const cwd = projectDir(input, { env: deps.env, cwd: deps.cwd, realpath: deps.realpathSync });
  const parts = [];
  const testCmd = deps.unitTestCommand(cwd);
  if (testCmd) parts.push(unitTests(testCmd));
  if (deps.graphifyInstalled()) {
    if (deps.graphifyFilesExist(cwd)) parts.push(GRAPHIFY_UPDATE);
    else parts.push(deps.graphifyConfigured(cwd) ? GRAPHIFY_BUILD : GRAPHIFY_SETUP);
  }
  const inside = deps.git(cwd, ['rev-parse', '--is-inside-work-tree']).status === 0;
  // /cdk:ship-release owns its commits while its marker exists.
  const marker = inside && shipReleaseMarker(cwd, deps.git, deps.existsSync);
  const unsafe = inside && deps.unsafeState(cwd);
  if (inside && !unsafe) parts.push(CHANGELOG);
  parts.push(DOCS);
  if (inside && !unsafe && !marker) parts.push(COMMIT);
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
