---
name: add-integration-tests
description: Writes integration tests apart from unit tests, with a throwaway container, stub, or fake per boundary, run until they pass. Use only when the user explicitly asks to write integration tests.
argument-hint: '[paths | feature description] [--yes]'
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *) Bash(docker info *)
---

# Write Integration Tests

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`; each spawn gets a complete brief (agent, kind, literal inputs, scope, return block; missing or ambiguous → `Question:`, never assume).
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Follow `${CLAUDE_SKILL_DIR}/references/conventions.md` (shared rules, faker libraries, integration rules); each states why.
- Only this skill asks and writes; `cdk:repo-analyzer` cannot ask, so its `Questions:` and `Missing:` lines are handled here.
- Writes: test files and test-only config (compose file for test services, fixtures). Tester installs and suite config belong to `cdk:setup-testing`. Never edit production code.
- Never point tests at production or shared environments; only throwaway services, stubs, or fakes.
- Caps: one practices researcher (step 5); step 3 re-spawns an analyzer at most once (`Stopped: 3: analyzer questions unresolved`); step 4 re-spawns once more after setup (`Stopped: 4: tester still missing`); step 9 run-fix rounds at most 3 (`Stopped: 9: tests still failing after 3 rounds`); step 10 one pass.
- Cancel answer → `Result: cancelled`. A stop or cap hit after tests exist → step 10 once on what is left, then `Result: stopped` with `Stopped: <step>: <reason>`.
- AskUserQuestion or Write unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer. Unattended runs (chained, `--yes`, auto) ask nothing: take the Recommended pick and list leftovers in `Open:`.
- Pin every container image to an explicit tag (never `latest`). Start services only with `compose-up` and a distinct project name (`cdk-it-<random>`) used for both `compose-up` and `compose-down`; `compose-down` (which uses `-v`) runs after each run and when the skill stops, only for a project this run started, never on a pre-existing project or compose file.
- Never delete or weaken a test to make it pass; a suspected production bug stays a failing test and is listed.

## Workflow

1. **Pre-flight.** Root = Context, else cwd. Stop on a rebase or merge in progress (`git-dir`: `rebase-merge`, `rebase-apply`, `MERGE_HEAD`; `Stopped: 1: git operation in progress`). Run `docker-info` once. Scope = paths, symbols, or a description from the input; absent → `all`; no match → ask with the closest fits.
2. **Packages.** `list-files` (outside git, Glob skipping `node_modules/`, `vendor/`, `.venv/`, build output); manifests per `${CLAUDE_SKILL_DIR}/references/stacks.md`. Monorepo → one package each, only those the scope touches. JS package manager per stacks.md; several lockfiles → ask.
3. **Analyze.** Spawn one `cdk:repo-analyzer` (`kind: tests`, `model: sonnet`) per package in one message (inputs in `flow.md` `## Analyze`); ask its `Questions:`, re-spawn once with answers.
4. **Decide.** Take the Recommended pick per open choice and report it; `Missing:` tooling → chain `cdk:setup-testing integration <package>` (`flow.md` `## Decide`).
5. **Practices.** Spawn one `cdk:topic-researcher` (brief in `flow.md` `## Spawn briefs`; official docs only; pass the `conventions.md` path so bundled rules are skipped) and use its cited `Findings:` as rule lines for the runner's official docs (plus Testcontainers when a container is picked); unavailable → bundled rules only.
6. **Baseline.** Run the existing integration suite unless it targets a non-local host (`flow.md` `## Baseline`). Every boundary already covered → `Result: nothing-to-do`.
7. **Plan.** Print a table per package: boundary `file:line`, dependency strategy, scenarios (success and failure), data setup and cleanup. Continue without asking.
8. **Write.** Per boundary, in the project's style: AAA blocks, seeded faker data with unique keys, real wiring of the project's own components, the chosen dependency strategy, cleanup per test.
9. **Run.** Start container services with `compose-up`, run the integration suite; fix test or setup bugs and re-run (cap in Rules). Code that looks wrong → keep the test failing and list it (`flow.md` `## Run`).
10. **Open items.** One pass over baseline failures, suspected bugs, and tests still failing (`flow.md` `## Open items`).
11. **Report.** Print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For analyze inputs, decide, baseline, run, and open-item handling, see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For shared test rules, faker libraries, and integration rules, see `${CLAUDE_SKILL_DIR}/references/conventions.md`.
- For stack signals, runners, Recommended testers, package manager, and targeted runs, see `${CLAUDE_SKILL_DIR}/references/stacks.md`.

## Output

```text
Packages: <path (manager)>, …
Stack: <languages / frameworks>
Runner: <runner> (<suite split>); faker <library>
Installed: <dev dependencies | none>
Scope: <whole code base | paths | feature>
Dependencies: <dependency — container | stub | fake>, …
Tests: <n files>, <n cases>; <passing>/<total> pass
Run: <suite command>
Rounds: <n>/3
Practices: bundled + <docs fetched | WebFetch unavailable>
Baseline failures: <test>, … | none | skipped (non-local host)
Suspected bugs: <file:line — kept failing>, … | none
Next: /cdk:commit-changes | none
Open: <item: reason; recommended fix>, … | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
