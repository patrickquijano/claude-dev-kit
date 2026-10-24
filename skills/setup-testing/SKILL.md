---
name: setup-testing
description: Sets up unit, integration, and end-to-end test tooling per package, with a recommended tester per kind and run scripts. Use only when the user explicitly asks to set up testing, or when chained.
argument-hint: '[unit|integration|e2e …] [package paths] [--yes]'
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(docker info *) Bash(command -v *)
---

# Setup Testing

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; spawn the per-package `cdk:repo-analyzer` agents in one parallel message, never `Explore` or `general-purpose`; each spawn gets the brief in `flow.md` `## Spawn briefs`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Only this skill asks and writes; `cdk:repo-analyzer` cannot ask.
- Input: kind words (`unit`, `integration`, `e2e`) limit the run to those kinds (absent: all three); paths limit it to the packages they touch (absent: every package). The `add-*-tests` skills chain this with one kind and one package.
- Idempotent: a re-run with everything configured changes nothing. Never overwrite an existing config, script, or tester; an existing tester of a kind wins over the recommendation.
- Writes: test config, dev-dependency and browser installs per a user pick, run scripts in the manifest, and the context note; never test files beyond an empty-suite placeholder a runner needs, never production code.
- Never install unasked, except in an unattended run (below): one AskUserQuestion per missing tool, each option naming its effect, Recommended first with its reason, Stop last, at most 4 questions per call. Unattended run (chained with a kind, `--yes`, or auto) → take the Recommended pick and report it.
- Layout: stack-native first, `tests/{unit,integration,e2e}` fallback; integration is always a separate suite.
- Caps: step 2 re-spawns an analyzer at most once; the fix pass in step 9 runs once; install and smoke failures stop the skill with no retry.
- Stop answer → `Result: cancelled`. Any later failure → step 9, then `Result: stopped` with `Stopped: <step>: <reason>`.
- AskUserQuestion or Write unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer; never print a final result in place of a pending question.

## Workflow

1. **Pre-flight.** Project dir = Context Repo root, else cwd. Stop on a rebase or merge in progress (`Stopped: 1: git operation in progress`); find packages, package manager, Docker (`flow.md` `## Pre-flight`).
2. **Analyze.** Spawn one `cdk:repo-analyzer` (`kind: tests`, `model: sonnet`) per package in one message, test kind `setup` (`flow.md` `## Analyze`).
3. **Decide.** Print the per-package table. All selected kinds configured and faker present → `Result: nothing-to-do`. Else ask per missing tool (`flow.md` `## Decide`).
4. **Install.** Picked testers, the faker library, and e2e browsers as dev dependencies; a failed install stops the skill.
5. **Configure.** Missing configs only, in the native layout (`flow.md` `## Configure and scripts`).
6. **Scripts.** Add `test:unit`, `test:integration`, `test:e2e` where missing; never one script for two kinds.
7. **Context note.** Write each kind's command and targeted-run form into the project context (`flow.md` `## Context note`).
8. **Smoke.** Run each configured suite once; an empty suite passes (`flow.md` `## Smoke`).
9. **Open items.** One capped fix pass, then list leftovers in `Open:` (`flow.md` `## Open items`).
10. **Report.** Print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For pre-flight, analyze, decide, configure, context note, smoke, and open items, see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For stack signals, runners, Recommended testers, package manager, faker libraries, and targeted runs, see `${CLAUDE_SKILL_DIR}/references/stacks.md`.
- For the native folder layout and per-kind config when writing configs, see `${CLAUDE_SKILL_DIR}/references/layout.md`.

## Output

```text
Packages: <path (manager)>, …
Stack: <languages / frameworks>
Testers: <kind — tester — state before → after>, …
Installed: <dev dependencies and browsers | none>, skipped: <tool, …> | none
Configs written: <file>, … | none
Smoke: <kind — pass | empty | fail>, … | not run
Scripts: <name → command>, … | none
Context note: <file: added | replaced | unchanged> | none
Docker: <available | unavailable (fakes)>
Open: <id: severity, reason; recommended fix, …> | none
Next: /cdk:add-unit-tests | /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
