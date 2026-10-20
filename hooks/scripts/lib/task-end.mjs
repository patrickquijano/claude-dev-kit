// End-of-task logic: the Stop hook (gate) blocks once per distinct uncommitted working-tree state, telling Claude what to do
// once the task is done: run the unit tests, refresh the Graphify graph, update docs, add changelog entries, then group,
// commit, and push the changes (the changelog and commit steps ask the user first). A step is left out only when it cannot run.
import { existsSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fingerprint } from './format-lint-repo.mjs';
import { git, readState, sha, shipReleaseMarker, statePath, unsafeState, writeState } from './git-state.mjs';
import { graphifyConfigured, graphifyFilesExist, which } from './graphify.mjs';
import { blockOutput, expected, projectDir } from './hook-io.mjs';
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
  fingerprint,
  readState,
  writeState,
  writeText: writeFileSync,
  statePath,
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
const CHANGELOG = `${STATUS} If this task changed user-facing behavior (skills, agents, hooks, commands, or anything CHANGELOG.md covers), ${ask('update the changelog', 'Update changelog', 'Lean Skip when the change is internal only or Unreleased already covers it.')} invoke the \`cdk:update-changelog\` skill via the Skill tool to add entries under Unreleased; never cut a release or bump the version. On "Skip", or when nothing user-facing changed, skip this step.`;
const DOCS = `${STATUS} If this task changed behavior, commands, paths, or components that README.md or related docs (CLAUDE.md, .claude/rules, skill references) describe, update them so they match; otherwise skip this step.`;
const COMMIT = `${STATUS} If the status lists changes, ${ask('commit and push them', 'Commit and push', 'Lean Skip when the work is unfinished, a check still fails, or the user said not to commit.')} invoke the \`cdk:commit-changes\` skill via the Skill tool with no \`paths:\` argument to group all uncommitted changes atomically and logically, commit, and push. On "Skip", or if the working tree is clean, skip this step.`;

// Ordered end-of-task steps; empty when none apply.
export function decide(input, deps = realDeps) {
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
  parts.push(DOCS);
  if (inside && !unsafe) parts.push(CHANGELOG);
  if (inside && !unsafe && !marker) parts.push(COMMIT);
  return parts;
}

const numbered = (parts) => parts.map((p, i) => `${i + 1}. ${p}`).join('\n');
const INSTRUCTION =
  'The working tree has uncommitted changes. If the task is finished, do these end-of-task steps now, in order, then stop. If it is not finished and you are waiting on the user, say so and stop:';

// Absolute path of this session's steps file inside the git dir, or '' outside git.
function stepsFile(cwd, session, deps) {
  const r = deps.git(cwd, ['rev-parse', '--git-path', `cdk-task-end-${sha(session)}.md`]);
  return r.status === 0 ? path.resolve(cwd, r.stdout.toString().trim()) : '';
}

// Writes the steps to the file and returns true; false when there is no git dir or it is unwritable.
function writeSteps(file, parts, deps) {
  if (!file) return false;
  try {
    deps.writeText(file, `${INSTRUCTION}\n${numbered(parts)}\n`);
    return true;
  } catch (e) {
    if (!expected(e, 'EACCES', 'EPERM', 'EROFS', 'ENOENT', 'ENOSPC')) throw e;
    return false;
  }
}
const stateFile = (input, cwd, deps) => deps.statePath('task-end', cwd, input.session_id);
const validSession = (input) => typeof input?.session_id === 'string' && input.session_id !== '';

// Stop-hook result: blocks once per distinct uncommitted working-tree state; else null.
export function gate(input, deps = realDeps) {
  if (!validSession(input)) return null;
  const cwd = projectDir(input, { env: deps.env, cwd: deps.cwd, realpath: deps.realpathSync });
  const file = stateFile(input, cwd, deps);
  const state = deps.readState(file);
  const now = deps.fingerprint(cwd, []);
  if (!now) return null;
  // The continuation that ran the steps may have edited docs or the changelog; record that tree instead of re-asking.
  if (state.awaiting && input.stop_hook_active === true) {
    deps.writeState(file, { firedAt: now, awaiting: false });
    return null;
  }
  if (now === state.firedAt) return null;
  const parts = decide(input, deps);
  if (!parts.length) return null;
  deps.writeState(file, { firedAt: now, awaiting: true });
  const steps = stepsFile(cwd, input.session_id, deps);
  const reason = writeSteps(steps, parts, deps)
    ? `End-of-task steps pending: read ${steps} and follow it, in order.`
    : `${INSTRUCTION}\n${numbered(parts)}`;
  return blockOutput('End-of-task steps pending', reason);
}
