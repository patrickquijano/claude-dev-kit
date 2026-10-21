---
name: implement-goal
description: Implements a goal end to end: clarifies goals, compares approaches, edits code and tests, validates, iterates up to 3 rounds. Use only when the user explicitly asks to implement a goal.
argument-hint: '[--yes] <requirement | spec file | issue text>'
allowed-tools: Bash(git rev-parse *) Bash(git status *) Bash(git diff *)
---

# Implement Goal

Input: $ARGUMENTS (strip `--yes`; the rest is the requirement text, a spec file path, or issue text)

## Context

- Root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`
- Branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '<none>'`
- Status: !`git status --porcelain=v1 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent subagents in one parallel turn.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Never commit, push, stash, or `reset --hard`; the user commits afterwards (`/cdk:commit-changes`).
- Change only what the goals need; no adjacent refactors.
- Lint, type check, test, and build commands come from the project's documented commands (CLAUDE.md `Commands`, then manifest scripts), not from `commands.md`.
- Add or update tests for every behavior the change touches; never weaken, skip, or delete an existing test.
- Caps: clarify max 3 rounds; fix max 3 attempts per validate pass (each attempt is an implementer re-spawn plus a fresh verifier run); step 9 max 3 rounds in total; step 3 one Explore spawn. Cap hit → print the Output with what is left under `Open:` and `Stopped: <step>: <reason>`.
- AskUserQuestion: max 4 questions per batch, recommended option first with a one-line reason, a `Stop` option on every batch, and nothing already answered.
- `--yes` is unattended: it asks nothing, records each assumption, and picks every recommended option, and continues without plan mode.
- AskUserQuestion unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer.

## Workflow

1. **Pre-flight.** Root `<none>` → `Result: stopped`, `Stopped: 1: not a git repository`. Note the dirty paths from Status; never edit one without asking.
2. **Plan mode.** Not in plan mode → ask whether to enter it, recommended option first with a reason from the input; the plan-mode path: `${CLAUDE_SKILL_DIR}/references/plan.md`.
3. **Analyze.** Always spawn one Explore agent with the input (a file path or URL it reads, else the requirement text); it returns the restated requirement and affected `path:line` references. Use them to restate the requirement in one paragraph.
4. **Clarify.** Ask batches for the gaps in scope, behavior, edge cases, and constraints, up to the cap. `Stop` → `Result: cancelled`.
5. **Goals.** List numbered goals, each with a checkable acceptance criterion, plus non-goals: `${CLAUDE_SKILL_DIR}/references/plan.md`.
6. **Approaches.** Compare 2–3 approaches with the recommended one first and ask `Pick` | `Stop`; in plan mode, write the plan and call `ExitPlanMode`: `${CLAUDE_SKILL_DIR}/references/plan.md`.
7. **Implement.** Spawn cdk:plan-implementer with `kind: requirement`, the root, restated requirement, goals, chosen approach, planned files, and repo instruction summary; `Changed:` → Output `Files`, `Tests:` → Output `Tests`, `Deviations:` → `Open:`, and `Question:` or a `blocked` status → ask the user and re-spawn.
8. **Review and test.** Spawn cdk:change-verifier with `kind: goals`, root, goals, and `Changed:` paths; its `Goals:`, `Findings:`, and `Checks:` feed the Output, `Limitations:` → `Open:`, a `blocked` status or `Question:` → ask the user, and findings or failed checks go back to the implementer as a fix list, then a fresh verifier, up to the fix cap: `${CLAUDE_SKILL_DIR}/references/validate.md`.
9. **Iterate.** A criterion unmet or a check still failing → back to step 5 with what was learned, up to the cap; the rest goes to `Open:`: `${CLAUDE_SKILL_DIR}/references/validate.md`.

## Files

- For goals, acceptance criteria, and the approach ask (steps 2, 5–6), see `${CLAUDE_SKILL_DIR}/references/plan.md`.
- For checks, evidence, and the iteration loop (steps 8–9), see `${CLAUDE_SKILL_DIR}/references/validate.md`.
- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.

## Output

```text
Requirement: <one line>
Plan mode: entered | declined | skipped (<reason>)
Goals: <n> met, <m> unmet
Approach: <chosen approach — one line>
Files: <path>, …
Tests: <path — added | updated>, … | none (<reason>)
Verify: <command> pass | fail | skipped (<reason>), … | not run
Rounds: <n>/3
Open: <id: severity, reason; recommended fix>, … | none | not run (nothing-to-do | cancelled | stopped)
Next: /cdk:review-local-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
