---
name: upgrade-dependencies
description: Upgrade a project's outdated dependencies to their latest stable versions. Detect the tech stack and every project in the repo, list outdated packages, look up breaking changes, find the code and config each upgrade affects, plan and apply the fixes, then build, lint, and test until everything passes. Use only when the user explicitly asks to upgrade, update, or bump dependencies or packages, check for outdated packages, or migrate to a newer framework or library version, e.g. "upgrade my dependencies", "update outdated packages", "bump everything to latest". Do not use on your own after finishing a task.
argument-hint: '[optional package names | project path | patch-minor-only]'
allowed-tools: Bash(git rev-parse *) Bash(git status *) Bash(git diff *) Bash(command -v *)
---

# Upgrade Dependencies

Input: $ARGUMENTS

## Rules

- User interaction (AskUserQuestion) only here; subagents can't ask.
- Latest stable only: skip pre-release, beta, RC, canary, and nightly versions, unless the user names one.
- Change manifests and lockfiles only as [managers.md](managers.md) says: its upgrade command, or its listed manifest edit followed by its lock or update command. Other hand edits desync the lockfile.
- Breaking changes come from the package's official changelog, release notes, or migration guide, never from memory. None found → say so in the plan and treat the major upgrade as high risk.
- One package (or one tightly coupled set, like `react` + `react-dom`) per upgrade step, validated before the next, so a failure points at one cause. Exception: patch and minor upgrades go as one batch; a batch failure → split it and retry package by package.
- Never delete tests, lower lint or type strictness, or add ignores to make checks pass; fix the code.
- Never commit, push, or change files outside the repo. The user commits (e.g. `/cdk:commit-changes`).
- Any Stop answer or failure → print the Output with `Stopped: <step>: <reason>` and end.
- Issue → check `## Known issues` first. Fix for a recurring or workflow-blocking issue → append `- <symptom> → <fix>` to source file (repo path, not plugin cache): skill issue → this SKILL.md; subagent "Known issue:" line → `agents/dependency-analyzer.md`. Not writable → print line for user.

## Workflow

1. **Preflight.** Root = `git rev-parse --show-toplevel`, else cwd. `git status --porcelain` not empty → AskUserQuestion: Stop and commit first (Recommended; keeps upgrade changes reviewable and revertible) | Continue anyway.
2. **Projects.** Find every project: manifests from [managers.md](managers.md) at root and below (skip `node_modules/`, `vendor/`, `.venv/`, build output), grouped by workspace (npm/pnpm/yarn workspaces, Cargo workspace, `go.work`, Maven modules, Gradle subprojects). Workspace = one project. Input names a path or packages → limit to those.
3. **Analyze.** Spawn one `cdk:dependency-analyzer` per project, all in one message, each with the project path, its package manager, the path `${CLAUDE_SKILL_DIR}/managers.md`, and the input's package filter. Missing package manager (`command -v` fails) → the analyzer still reports from the lockfile and registry, but that project is excluded from steps 5–9 with the reason (upgrades need the tool).
4. **Report.** Print one table per project: package, current, latest stable, bump (patch | minor | major), breaking changes (one line + source URL), affected files, config files. Nothing outdated → stop ("all dependencies are up to date").
5. **Select.** Input `patch-minor-only` → select all patch and minor, drop majors, no question. Else AskUserQuestion, multiSelect: All patch and minor (Recommended; no breaking changes expected) | each major upgrade by name, with its breaking-change count in the description. More than 4 options → more questions in the same call (max 4 per question). Nothing selected → stop.
6. **Plan.** For each selected major (and any minor with listed breaking changes), per affected file and config: the change the migration guide requires, and the fix. Several valid fixes → pick the one the guide recommends; say why. Print the plan (package → version, then files with the planned edit), AskUserQuestion: Apply (Recommended) | Revise | Stop. Revise → take the feedback, re-plan.
7. **Baseline.** Run the step 9 checks once before any upgrade and record what already fails, so only new failures count later.
8. **Apply.** Per package in plan order: run the upgrade command from managers.md, then the planned code and config edits, then step 9. Order: patch and minor first (one batch), then each major, dependencies before dependents (e.g. a framework before its plugins).
9. **Validate.** After each step, run the project's own checks in this order, skipping those it lacks: install (clean, from the lockfile), build, type check, lint, tests. Use real commands from the manifest scripts, Makefile, or CI config; list them in the Output. A failure, error, or deprecation warning not in the baseline → find the root cause in the changelog or migration guide, fix it, re-run the check. Still failing after 3 fix rounds → AskUserQuestion: Revert this package (Recommended; keeps the rest green) | Keep and stop | Keep trying. Revert → run the managers.md upgrade command with the old version and undo that step's code and config edits (not `git checkout`, which also drops earlier upgrades).
10. **Review.** Show `git diff --stat` and the per-package summary. Re-read each changed file for leftovers: old API names, stale config keys, deprecated options the guide lists.
11. **Improve.** A step in this run failed, needed a workaround, or hit a manager or ecosystem missing from managers.md → draft the edit (new Known issues line, managers.md row, or clearer step) and show it. AskUserQuestion: Apply to this skill (Recommended; the next run avoids the same problem) | Skip. Apply → edit the source files (repo path, not plugin cache).
12. **Report** the output below.

## Output

```text
Projects: <path (manager)>, …
Upgraded: <package current → new>, …
Skipped: <package: reason>, …
Code and config changes: <file — change>, …
Checks: <command: pass | fail>, …
Reverted: <package: reason> | none
Skill improvements: <applied | skipped | none>
Next: review the diff, then commit (e.g. /cdk:commit-changes)
Stopped: <step>: <reason>   # only when stopped
```

## Known issues

- none
