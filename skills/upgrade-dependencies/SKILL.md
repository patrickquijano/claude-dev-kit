---
name: upgrade-dependencies
description: Upgrades outdated dependencies to their latest stable versions, fixes breaking changes, then builds, lints, and tests until green. Use only when the user explicitly asks to upgrade dependencies.
argument-hint: '[optional package names | project path | patch-minor-only]'
allowed-tools: Bash(git rev-parse *) Bash(git status *) Bash(git diff *) Bash(command -v *)
---

# Upgrade Dependencies

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Only this skill asks the user (AskUserQuestion); subagents cannot. Unavailable → ask the pending question as plain text, end the turn, and take the next message as the answer.
- Latest stable only: skip pre-release, beta, RC, canary, and nightly versions, unless the user names one.
- Change manifests and lockfiles only as `${CLAUDE_SKILL_DIR}/references/managers.md` says: its upgrade command, or its listed manifest edit followed by its lock or update command. Other hand edits desync the lockfile.
- Breaking changes come from the package's official changelog, release notes, or migration guide, never from memory. None found → say so in the plan and treat the major upgrade as high risk.
- One package (or one tightly coupled set, like `react` + `react-dom`) per upgrade step, validated before the next. Exception: patch and minor upgrades go as one batch; a batch failure → split it and retry package by package.
- Never delete tests, lower lint or type strictness, or add ignores to make checks pass; fix the code.
- Never commit, push, or change files outside the repo; the end-of-task hook commits.
- Caps: fix rounds per failing check 3, then revert that package and continue (`${CLAUDE_SKILL_DIR}/references/validate.md`); one retry of a reverted package by a safer path (for example an intermediate version) in step 11.
- Unattended (chained, hook-run): ask nothing; apply patch and minor only and list majors under `Open:`.
- Pre-flight stops and cancels print the Output with `Stopped:`. A later failure or cap → still print the Output, with what is left under `Open:`.

## Workflow

1. **Pre-flight.** Root = Context → Repo root. `<none>` → stop (init git first). `dirty-tree` not empty → stop (commit or stash first).
2. **Projects.** Find manifests from `managers.md` at root and below (skip `node_modules/`, `vendor/`, `.venv/`, build output); a workspace is one project. Input names a path or packages → limit to those.
3. **Analyze.** Spawn one `cdk:dependency-analyzer` per project in one message: project path, its manager, the `managers.md` path, the input's package filter. `tool-check` fails → exclude that project from steps 5-9 and say why.
4. **Report.** Print one table per project: package, current, latest, bump, dev?, breaking changes with URL, affected files, config files, requires. Nothing outdated → `Result: nothing-to-do`.
5. **Select.** `patch-minor-only` → all patch and minor, no question. Else AskUserQuestion per `${CLAUDE_SKILL_DIR}/references/select.md`.
6. **Plan.** Per selected major (and minor with breaking changes): the guide's required edit per affected file and config. Print it; apply without asking (the diff is reviewable).
7. **Baseline.** Run the step 9 checks once before any upgrade; only new failures count later.
8. **Apply.** Per package, patch and minor batch first, then majors with dependencies before dependents: record its manifest specifier, run its `managers.md` upgrade command (workspace: in the declaring member), apply the planned edits, then step 9.
9. **Validate.** Run install (from lockfile), build, type check, lint, tests from the analyzer's `Checks:`, skipping missing ones. New failure → fix or revert per `${CLAUDE_SKILL_DIR}/references/validate.md`.
10. **Review.** Show `diff-stat` and a per-package summary. Re-read changed files for leftovers (old API names, stale keys, deprecated options); record them under `Leftovers:`.
11. **Retry.** Retry each reverted or skipped package once by a safer path, only when checks pass at baseline; declined majors stay open. Rerun step 9 for it.
12. **Report.** Print the Output; list unfixed failures, reverts, declined majors, and leftovers under `Open:`.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For per-manager detect, upgrade, workspace, and registry lookups, see `${CLAUDE_SKILL_DIR}/references/managers.md`.
- For the step 5 question and its outcomes, see `${CLAUDE_SKILL_DIR}/references/select.md`.
- For the fix loop and the exact revert, see `${CLAUDE_SKILL_DIR}/references/validate.md`.

## Output

```text
Projects: <path (manager)>, …
Upgraded: <package current → new>, …
Skipped: <package: reason>, … | none
Code and config changes: <file — change>, …
Checks: <command: pass | fail | fail (baseline)>, …
Reverted: <package: reason> | none
Leftovers: <file: item>, … | none
Next: review the diff
Open: <item: reason; recommended fix>, … | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
