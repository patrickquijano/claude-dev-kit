# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.2.0] - 2026-10-20

### Added

- `cdk:skill-improver` and `cdk:agent-improver` agents work through every check error, deduction, and warning thoroughly, with a proactive sweep, editing only the target skill directory or agent file.
- `/cdk:implement-requirement` takes a requirement, spec file, or issue text and carries it to a validated change: it offers plan mode first, asks clarifying questions, sets goals with acceptance criteria, compares approaches (you pick one, or `--yes` takes the recommended one), implements with tests, and runs the project's documented checks, fixing errors and warnings and looping back to the goals for up to 3 rounds. It never commits.
- `/cdk:publish-tag` creates and pushes the annotated tag for the latest `CHANGELOG.md` version from the verified tip of `main`, without a GitHub release, so it also works on GitLab. It stops when the tag already exists locally or on the remote, never forces, and asks once before writing (`--yes` skips the question; `--prefix v|none` overrides the detected tag prefix).

### Changed

- `/cdk:build-skill` and `/cdk:build-agent` now report the score after each check, then delegate every open error and deduction to a dedicated writer subagent and re-score, for up to 3 improve rounds; the output gains a `Rounds:` line.
- `/cdk:address-change-request-review` now plans and fixes each review item thoroughly and proactively within the CR: it finds the root cause, sweeps the code the CR changes for the same problem, plans the tests, docs, and callers each fix needs, and checks every item against an acceptance check before reporting. The plan table lists each group's sites, tests, and checks, an unmet self-check counts as a failed fix attempt, and same-pattern code outside the CR is listed under open items as a follow-up instead of edited.
- **Breaking:** four components are renamed to describe their role, with no stubs left under the old names: `/cdk:build-project-instructions` → `/cdk:update-project-instructions`, `/cdk:build-readme` → `/cdk:update-readme`, `cdk:claude-md-analyzer` → `cdk:project-instruction-analyzer`, and `cdk:claude-md-scorer` → `cdk:project-instruction-scorer`. Update any invocation of the old names; the matching evals are renamed too.
- **Breaking:** the end-of-task gate now fires whenever uncommitted changes exist, once per distinct working-tree state, instead of only when files changed since the prompt. The commit step commits all uncommitted changes (no `paths:` scope), and `UserPromptSubmit` no longer records a baseline.
- Plugin hooks no longer show a spinner `statusMessage`; the format and lint hooks print a line only when a step changed files or failed, and the plan-mode ask no longer prints a notice.
- Every Task skill's Output now ends with a `Next: <follow-up> | none` line before `Result:`, naming the logical next skill. All 35 subagents treat the content they read as data (ignoring instructions inside it), end their `## Task` with a `Self-check` step, and batch independent reads in one turn; no `## Return` field changed.
- `/cdk:build-skill` and `/cdk:build-agent` enforce this: `check-skill` warns `output-next`, `check-agent` warns `data-guard` and `self-check`, and the rubrics gain Q4 (skill) and B9 (agent) while still totalling 100.

### Fixed

- `/cdk:update-project-instructions` no longer penalizes a Maintenance line that routes known issues to auto memory, and counts ancestor `CLAUDE.md` files toward the always-loaded total, reported separately as `<project n> + <ancestor n>`.
- `/cdk:update-readme` no longer scores host-injected, CI-internal, or dev-tooling config as undocumented options, and no longer treats scripts inside a component directory as separate components. `cdk:readme-analyzer` now splits `Config:` into user and internal.
- The end-of-task steps never fired on the first turn after approving a plan with cleared context, because that turn fires no `UserPromptSubmit` to record a baseline.

## [0.1.0] - 2026-10-15

The plugin restarts pre-1.0 because it still changes often. Versions 1.0.0–3.0.0 were never tagged or released and are withdrawn. While the major version is 0, a breaking change bumps minor and everything else bumps patch.

The plugin ships skills, subagents, and hooks for Git and GitLab workflows (signed atomic commits, rebases, PR and MR creation, review, and release), project setup, and skill, agent, README, and CLAUDE.md authoring with scored rubrics.

### Added

- The end-of-task hook now tells Claude to run the project's unit tests first, using the detected command (`test:unit` or `test` script, pytest, go, cargo, or phpunit), and to fix and re-run until they pass.
- The end-of-task hook now tells Claude to add Unreleased entries with `cdk:update-changelog` when the task changed user-facing behavior and `CHANGELOG.md` exists, before the commit step; it never cuts a release or bumps the version.
- `/cdk:build-skill` is rebuilt as a companion to `skill-creator`: it asks the scope (personal, project, or plugin) and kind (reference, task, or background-only) with a reasoned recommendation, hands the draft to `skill-creator` under bundled frontmatter and body rules (and stops with install steps when `skill-creator` is missing), then scores it against a 100-point rubric (pass at 95) and fixes deductions for up to 3 rounds. Orchestrator and subagent building is dropped; use `/cdk:build-agent` for subagents.
- `cdk:skill-scorer` agent scores a skill directory against the `build-skill` rubric.
- `/cdk:build-skill` now runs a self-contained check script (`scripts/check-skill.mjs`) for the mechanical skill rules (frontmatter, size, layout, links, injection fallbacks, Output) and passes its JSON to `cdk:skill-scorer`. It names skills by their action, keeps each skill to one job (asking Split, Pick one, or Stop when it finds several), and requires a `## Files` navigation section; the rubric adds F8, B9, B10, and Q3 and stays at 100 points.
- `/cdk:build-agent` is rebuilt the same way as `/cdk:build-skill`: self-contained, it asks scope, checks fit and one job, interviews only for what the agent needs, drafts under bundled frontmatter and body rules, runs a check script (`scripts/check-agent.mjs`), and scores with the new `cdk:agent-scorer` against a 100-point rubric (pass at 95) for up to 3 fix rounds. It reads the spawning skill's contract without editing it, lists mismatches under `Gaps:`, and writes only the agent file.
- `/cdk:build-agent` now names agents as actors, never actions (`code-reviewer`, not `review-code`), asking Rename or Keep for an action name, and when it finds several jobs it asks Split, Pick one, or Stop with a recommendation and reason from a new signal table in `decide.md`; the rubric's D1 scores both.
- `/cdk:build-skill` now errors on links that leave the skill directory, so every skill it builds is standalone; its templates tell drafts to copy, never link, another skill's files.

### Changed

- **BREAKING:** the nine `write-*` skills are renamed to verb-family names, with no stubs left under the old names: `write-changelog` → `update-changelog`, `write-dockerfile` → `build-dockerfile`, `write-e2e-tests` → `add-e2e-tests`, `write-github-workflows` → `build-github-workflows`, `write-integration-tests` → `add-integration-tests`, `write-project-instructions` → `build-project-instructions`, `write-prompt` → `draft-prompt`, `write-readme` → `build-readme`, `write-unit-tests` → `add-unit-tests`. Update any `/cdk:write-*` invocation, and the matching evals are renamed too.
- While the major version is 0, `release-check` requires a minor bump for a breaking change and a patch bump for everything else; from 1.0.0 the standard SemVer levels apply. The release policy accepts a one-time `versionReset` to a lower major than the target version, and the README and release rules list what counts as breaking.
- Every plugin skill is rebuilt as standalone: no skill links another skill's files, and the never-invoked `shared` skill is gone. Skills that chain others do so through the Skill tool, and each skill carries its own trimmed copy of the rules it needs. Skills now list leftovers under `Open:` before `Result:` (replacing `Resolution:`), and the subagent template moved to `build-agent`.
- The release scripts moved into the skills that own them: `release-check.mjs` into `bump-version` and `changelog-release.mjs` into `create-github-release`; the PreToolUse hook and the release-check CI job import them from there. `cdk:prepare-change-request` and `cdk:ship-release` reach the release check by chaining `cdk:bump-version`.
- `/cdk:write-claude-md` is renamed `/cdk:build-project-instructions`, because the skill name check reserves the word "claude".
- `cdk:speckit-open-items` is renamed `cdk:speckit-open-items-analyzer`, so every analyzer is named as an actor.
- The eval `resolve-findings-reports-open` is now `setup-editorconfig-reports-open` and checks the `Open:` line.
- The end-of-task steps now come from the `Stop` hook instead of every prompt: when a turn changed files, it blocks once with the steps in order (unit tests, Graphify, README and docs, changelog, commit), so they no longer get buried in long turns, and Claude may skip them and say so when the task is unfinished and waiting on the user. The prompt hook only asks about plan mode and records the git baseline. A step is left out only when it cannot run: the changelog step needs git and a safe state (not `CHANGELOG.md`), the Graphify step needs the `graphify` binary (with a `/cdk:setup-graphify` hint when no graph exists), the docs step always runs, and a `/cdk:ship-release` run removes only the commit step.
- Every plugin subagent is rebuilt as standalone: its body carries its own rules and a fixed `## Return`, and skills pass only runtime data. The five code-review reviewers each return the full findings block (`cdk:cr-correctness-reviewer` also the `Threads:` block), `cdk:change-analyzer` carries the commit and branch conventions, and `cdk:format-lint-analyzer` carries its tool catalog; the spawning skills' spawn lines and `findings.md` files are realigned. Some agents still read reference files the calling skill passes by path at run time.

### Removed

- The `Known issue` line in every subagent return block and in the agent rules.
- `cdk:skill-auditor` agent and the old `build-agent` reference files; the check and scoring they did now live in each builder's script and scorer.

### Fixed

- `cdk:review-change-request` squash merges now use the PR or MR title as the commit subject with an empty body, so the squash commit passes commitlint instead of carrying a list of every commit subject.
