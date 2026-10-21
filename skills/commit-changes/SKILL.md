---
name: commit-changes
description: Groups uncommitted changes into atomic, signed Conventional Commits, moves off protected branches, and pushes. Use only when the user explicitly asks to commit, or when chained.
argument-hint: '[optional grouping hints] [paths: <file> ...]'
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git config --get *) Bash(git rev-parse *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(git remote get-url *) Bash(git restore --staged *) Bash(mktemp *) Bash(git add *) Bash(git apply --cached *) Bash(glab api --paginate projects/:id/protected_branches) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected) Bash(git show-ref *)
---

# Commit Changes

Input: $ARGUMENTS

## Context

- Branch: !`git rev-parse --verify -q HEAD >/dev/null 2>&1 && git rev-parse --abbrev-ref HEAD || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Subjects, branch names, protected branches, and signing follow `${CLAUDE_SKILL_DIR}/references/conventions.md`. A repo commitlint config (`commitlint.config.*`, `.commitlintrc*`, or `commitlint` in `package.json`) is the source of truth; check each subject with `commitlint` (permission-prompted). Not installed → `Commitlint: skipped (not installed)`.
- Signed: always exactly `commit`, no other flags. Never `--no-gpg-sign`, `--no-verify`, `-n`, `--amend`, `--force`. `commit`, `push`, `push-upstream`, `switch-branch`, and `remote-branch-exists` stay out of `allowed-tools`, so the permission prompt guards them.
- Commit and push without asking for confirmation.
- Caps: hook-fix retries 3 per commit; commitlint redrafts 3 per subject; analyzer respawn after `Questions` 1; branch-name suffix search 10. Cap hit → stop, `Open:` lists what is left.
- Two paths from step 4, by counts and a secret-pattern scan, never by reading diffs for meaning: small = main thread, no subagent, no questions; analyzed = `cdk:change-analyzer` (`mode=group`) so large diffs stay out of this context. It cannot ask: relay its `Questions` with AskUserQuestion. Any doubt → analyzed.
- `paths: <file> ...` in the input → classify, group, stage, and commit only those paths; every other dirty file goes under `Excluded: pre-existing`, unstaged. No `paths:` → all changes.
- Atomic: one logical change per commit; config goes with the files it configures; a rename (`D` old + `??` new) stays in one commit.
- Secrets: a file name (`.env*`, key files) or diff content (`-----BEGIN`, `AKIA`, `ghp_`, `github_pat_`, `gh[ousr]_`, `glpat-`, `xox[bp]-`, `sk-ant-`, `sk-proj-`, `AIza`) is left unstaged, listed under `Excluded`, and warned about.
- Unattended (chained by another skill): ask nothing; `Open:` reports each item with its recommended fix. Chained skills invoke this one through the Skill tool, so it never sets `disable-model-invocation`.

## Workflow

1. **Pre-flight.** Check signing per `conventions.md` `## Signing`. Missing or mismatch → stop and tell the user what to set.
2. **Unstage.** `staged-names` non-empty → `unstage`; a path both staged and modified (`MM` in `status`) → first AskUserQuestion ("Unstage all (drops the staged split)", "Stop"); unattended unstages and notes it under `Open:`.
3. **Collect.** `status`; with `paths:`, set the rest aside as `Excluded: pre-existing`. Nothing left → `Result: nothing-to-do`. Make a temp dir with `scratch` for the message and patch files.
4. **Classify.** `numstat` (fails, e.g. no commits yet → analyzed) plus `untracked-numstat` per untracked file. Small = all of the count limits: ≤5 files; ≤150 added + deleted lines; no binary; no delete or rename; no lockfile, CI, migration, or infra path (`*.lock`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `.github/`, `.gitlab-ci.yml`, `migrations/`, `Dockerfile*`, `docker-compose*`, Terraform); one top-level directory; no grouping hints. Else analyzed (it scans secrets). Only a small candidate runs `diff-head` and checks the untracked files for a secret-pattern name or hit; any hit → analyzed.
5. **Branch guard.** Current = Context → Branch; `HEAD` (detached) → `detached@<sha>` from `short-head`, protected. Default = `default-branch` minus `origin/` (unset → `main`). Current is default or protected → switch needed.
6. **Group.** Small: one group, subject drafted here. Analyzed: spawn `cdk:change-analyzer`. Commitlint and branch naming: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Group`.
7. **Plan.** Show `Branch: <current> → <target>` (when switching), each group's subject and files, then the `Excluded` files with a warning. No prompt.
8. **Commit.** Switching → `switch-branch`. Per group: `stage-files` (or `stage-patch` for split files), write the subject to `<scratch>/msg`, then `commit`; never inline the subject in shell args. Failures: `flow.md` `## Commit failures`.
9. **Verify.** `verify-log`: every `%G?` is `G`, every subject ≤72 chars, and `tree-status` shows only excluded files. Fail → stop.
10. **Push.** `origin-url` fails → skip, `Branch:` says `not pushed`. Else `push`; `push-upstream` when `upstream` fails or is not `origin/<branch>` (never follow an upstream like `origin/main`). Fail → report the exact error line and stop.
11. **Report.** Fill `Open:` per `flow.md` `## Open items`; print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For subject, branch name, protected-branch, and signing rules, see `${CLAUDE_SKILL_DIR}/references/conventions.md`.
- For grouping, commit failures, and the `Open:` items (steps 6, 8, 11), see `${CLAUDE_SKILL_DIR}/references/flow.md`.

## Output

```text
Path: small | analyzed
Branch: <branch> → <remote>/<branch> | not pushed
Switched from: <protected/default branch or none>
Commits:
- <hash> <subject> [signature: G]
Commitlint: pass | skipped (not installed) | fail (<error line>) | n/a
Excluded: <files or none>
Next: /cdk:prepare-change-request | none
Open: <item: impact; recommended fix, …> | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
