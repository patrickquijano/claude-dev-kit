---
name: add-unit-tests
description: Writes unit tests until a target coverage is met (default 90%), with AAA positive and negative cases using faker values. Use only when the user explicitly asks to write unit tests or raise coverage.
argument-hint: '[target coverage %] [paths | feature description]'
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *)
---

# Write Unit Tests

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Follow `${CLAUDE_SKILL_DIR}/references/conventions.md` (AAA, faker, coverage, unit, ES modules, safety); read it fully in step 1.
- Never edit production code. Writes: test files (moved with `git-mv`), test setup files, runner globs. Tool installs and configs belong to `cdk:setup-testing`.
- `cdk:repo-analyzer` cannot ask: ask its `Questions:` and `Missing:` lines here with AskUserQuestion.
- Caps: analyzer re-spawn 1 (step 3); setup chain re-spawn 1 (step 5); fixes per new test 2 and coverage rounds 5 (step 10); leftover fix pass 1 round (step 11).
- A cap hit or failure → run step 11 on what is left, without re-entering the loop, then print the Output with `Result: stopped`. A stop answer → `Result: cancelled`.
- Detail for steps 3, 5, 6, 10, 11 and the AskUserQuestion or Write fallbacks: `${CLAUDE_SKILL_DIR}/references/flow.md`.

## Workflow

1. **Pre-flight.** Read `conventions.md`. Project dir = Context → Repo root, else cwd. Extract target (percent, default 90), metric (line, branch, statement, function; default line), scope (paths, symbols, feature; default `all`). Target outside 1–100 or empty scope → AskUserQuestion with the closest fits.
2. **Packages.** `list-files` (outside git: Glob skipping `node_modules/`, `vendor/`, `.venv/`, build output). Find packages and JS package managers per `${CLAUDE_SKILL_DIR}/references/stacks.md`; keep those the scope touches.
3. **Analyze.** Spawn one `cdk:repo-analyzer` (`kind: tests`, `model: sonnet`) per package, test kind `unit`; use `Runner:`, `Coverage:`, `Faker:`, `Conventions:`. Ask `Questions:`, re-spawn per `flow.md`.
4. **Practices.** WebFetch the runner's official docs (`conventions.md` Shared rules); note runner-specific rules.
5. **Decide.** Take Recommended picks and report them. `Missing:` runner, coverage, or faker → chain `cdk:setup-testing unit <package>` per `flow.md`.
6. **Baseline.** Measure existing coverage per `flow.md`. Target already met and nothing misplaced or non-conforming → `Result: nothing-to-do`.
7. **Relocate and upgrade.** JS/TS ES modules only, before new tests: `git-mv` each `Misplaced:` test to `tests/unit/`, fix runner globs, upgrade each `Non-conforming:` test, hand I/O cases to `cdk:add-integration-tests`.
8. **Plan.** Print a table per package (target `file:line`, symbol, positive and negative cases, doubles; lowest coverage first). Continue without asking.
9. **Write.** Per target, in the project's style and `conventions.md` Unit: AAA, seeded faker inputs, 2+ positive, 2+ negative, I/O doubled.
10. **Measure.** Run new tests with coverage; fix and add cases per the measure loop in `flow.md`.
11. **Fix leftovers.** One pass over what is left per `flow.md`; list the rest in `Open:`.
12. **Report.** Print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For rules on AAA, faker, coverage commands, unit scope, and ES modules, see `${CLAUDE_SKILL_DIR}/references/conventions.md`.
- For package manager detection, runner signals, and Recommended runners per stack, see `${CLAUDE_SKILL_DIR}/references/stacks.md`.
- For analyzer re-spawns, the setup chain, baseline, the measure loop, leftovers, and fallbacks, see `${CLAUDE_SKILL_DIR}/references/flow.md`.

## Output

```text
Packages: <path (manager)>, …
Stack: <languages / frameworks>
Runner: <runner> + coverage <provider>; faker <library>
Installed: <dev dependencies | none>
Scope: <whole code base | paths | feature>
Target: <n>% <metric>
Coverage: <package>: <baseline>% → <final>%, …
Tests: <n files>, <n cases> (<positive> positive, <negative> negative)
Relocated: <from → to>, … | none
Needs refactor: <module — reason>, … | none
Rounds: <n>/5
Practices: bundled + <docs fetched | WebFetch unavailable>
Baseline failures: <test>, … | none
Suspected bugs: <file:line — kept failing>, … | none
Uncovered: <file — n%>, … | none
Next: /cdk:commit-changes | none
Open: <item: reason; recommended fix>, … | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
