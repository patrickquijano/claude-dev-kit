---
name: add-e2e-tests
description: Writes end-to-end tests for critical user journeys through the UI, API, or CLI, in AAA form with faker values and no fixed sleeps. Use only when the user explicitly asks to write e2e tests.
argument-hint: '[paths | journeys | feature description]'
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *)
---

# Write E2E Tests

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Every test follows `${CLAUDE_SKILL_DIR}/references/conventions.md` (Shared rules, Faker libraries, End to end).
- Only this skill asks and writes; `cdk:repo-analyzer` cannot ask, so its `Questions:` and `Missing:` lines are asked here.
- Writes: test files and test-only config (seed scripts, auth setup); framework and browser installs belong to `cdk:setup-testing`; never production code.
- Never run against production or shared environments; only a locally started app or a URL the user confirms is local or safe.
- Caps: one practices researcher (step 5); analyzer re-spawn after `Questions:` 1 (still open: stop); re-spawn after setup 1; run-fix rounds 3; open-items pass 1.
- Stop answer or user cancel: `Result: cancelled`. A cap hit or failure after tests exist: run step 10, then `Result: stopped` with `Stopped: <step>: <reason>`.
- Unattended (chained or no AskUserQuestion): ask nothing; take Recommended picks; an unanswerable local-or-safe URL question stops.
- AskUserQuestion or Write unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer; never print a final result in place of a pending question.
- Never delete or weaken a test to make a run pass; a suspected production bug keeps its test failing and goes to `Open:`.

## Workflow

1. **Pre-flight.** Project dir = Context Repo root, else cwd. Stop on a rebase or merge in progress; take scope from the input, else `all` (`flow.md` `## Pre-flight`).
2. **Packages.** Find packages with `list-files` and manifests; detect the JS package manager (`flow.md` `## Packages`).
3. **Analyze.** Spawn one `cdk:repo-analyzer` (`kind: tests`, `model: sonnet`) per package in one message, test kind `e2e` (`flow.md` `## Analyze`).
4. **Decide.** Take Recommended picks; ask only the local-or-safe app URL; chain `cdk:setup-testing` for missing tools (`flow.md` `## Decide`).
5. **Practices.** Spawn one `cdk:topic-researcher` (official docs only; pass the `conventions.md` path so bundled rules are skipped) and use its cited `Findings:` as rule lines for the picked framework's official docs; unavailable → bundled rules only.
6. **Baseline.** Run the existing e2e suite with the app started; note failures and continue. Every journey covered → `Result: nothing-to-do` after step 10.
7. **Plan.** Print one table per package (journey, entry `file:line`, steps, assertions, data setup), critical journeys first; continue without asking.
8. **Write.** One test per journey in the project's style and the End to end rules: AAA, seeded faker data, user-facing locators, retrying assertions.
9. **Run.** Run the suite with the app started; fix test, locator, or setup bugs and rerun (cap in Rules; `flow.md` `## Run`).
10. **Open items.** One pass over leftovers (`flow.md` `## Open items`), listed in `Open:`.
11. **Report.** Print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For step detail (pre-flight, packages, analyzer input, decisions, run loop, open items), see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For AAA, faker, and End to end rules, see `${CLAUDE_SKILL_DIR}/references/conventions.md`.
- For stack signals, e2e runners, Recommended frameworks, package manager, and targeted runs, see `${CLAUDE_SKILL_DIR}/references/stacks.md`.

## Output

```text
Packages: <path (manager)>, …
Stack: <languages / frameworks>
Framework: <framework> (<browsers | API | CLI>); faker <library>
Installed: <dev dependencies, browsers | none>
Scope: <whole code base | paths | journeys | feature>
App start: <command> at <url> | <url> (running) | n/a (CLI)
Journeys: <journey — n cases>, …
Tests: <n files>, <n cases>; <passing>/<total> pass
Run: <suite command>
Rounds: <n>/3
Practices: bundled + <docs fetched | WebFetch unavailable>
Baseline failures: <test>, … | none
Next: /cdk:commit-changes | none
Open: <id: severity, reason; recommended fix, …> | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
