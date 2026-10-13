---
name: commit-changes
description: Group uncommitted changes into atomic, signed Conventional Commits, switch off default/protected branches, and push. Use only when the user explicitly asks to commit their changes, e.g. "commit and push", "commit my changes", "split this into atomic commits". Also runs when the cdk end-of-task hook instructs it. Do not use on your own after finishing a task.
argument-hint: '[optional grouping hints] [paths: <file> ...]'
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git config --get *) Bash(git rev-parse *) Bash(git symbolic-ref *) Bash(git remote get-url *) Bash(git restore --staged *) Bash(mktemp *) Bash(git add *) Bash(git apply --cached *) Bash(git switch -c *) Bash(glab api --paginate projects/:id/protected_branches) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected) Bash(git show-ref *) Bash(git ls-remote *)
---

# Commit Changes

Input: $ARGUMENTS

## Context

- Branch: !`git rev-parse --verify -q HEAD >/dev/null 2>&1 && git rev-parse --abbrev-ref HEAD || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Subjects and branch names follow `${CLAUDE_SKILL_DIR}/references/conventions.md`. Repo has commitlint config → it is source of truth.
- Signed: always exactly `commit`, no other flags. Never `--no-gpg-sign`, `--no-verify`, `-n`, `--amend`, `--force`. `commit` stays out of `allowed-tools` (a `git commit -S -F *` pattern would also match `--no-verify`), so the permission prompt is a second guard.
- Commitlint config (`commitlint.config.*`, `.commitlintrc*`, or `commitlint` in `package.json`) → check each subject with `commitlint` (permission-prompted: it runs repo config). Not installed (npx error, not a lint error) → skip check, `Commitlint: skipped (not installed)`.
- Commit and push without confirmation. `push` and `push-upstream` stay out of `allowed-tools`, so the permission prompt guards the publish.
- Caps: hook-fix retries 3 per commit; commitlint redrafts 3 per subject (small path included); analyzer respawn after `Questions` 1; branch-name suffix search max 10. Cap hit → run step 11 (**Resolve findings.**) on what is left, without re-entering the loop, then print the Output with `Stopped:`.
- Two paths, chosen by step 4 from counts plus a secret-pattern scan, never from reading diffs for meaning: small = main thread, no subagent, no AskUserQuestion, only the path-and-numstat type rule; analyzed = step 6 spawns `cdk:change-analyzer` (`mode=group`) so large diffs stay out of this context. It cannot ask; relay its `Questions` with AskUserQuestion. Pass only root, hints, `paths`, `mode`, `branch=yes|no`, the prior `Groups`, `Split`, and `Excluded` (on a respawn), answers to earlier `Questions`, commitlint error lines, and the conventions path. Any doubt → analyzed.
- `paths: <file> ...` in the input (the end-of-task hook passes the files this task changed) → scope the run to those paths: classify, group, stage, and commit only them, and list every other dirty file under `Excluded: pre-existing` without staging it. No `paths:` → all changes.
- Atomic: one logical change per commit. Group related files; config goes with the files it configures. Rename (`D` old + `??` new) stays in one commit.
- Secrets never committed: the analyzer (small path: step 4) flags file names (`.env`, keys) and diff content (`-----BEGIN`, `AKIA`, `ghp_`, `glpat-`, `xox[bp]-`) under `Excluded`. Flagged → leave unstaged, list under Excluded, warn user.
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/fallbacks.md`.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/resolve-findings.md` (scope: ask-only; sources: `Excluded:` secret-flagged files, `Commitlint:` skipped or `fail (<error line>)`, `Branch:` `not pushed` with no origin).
- Unattended when run by the cdk end-of-task hook or chained by another skill: it asks nothing, and step 11 only reports open items with their recommended fix.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/known-issues.md` with slug `commit-changes` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Pre-flight.** Signing per conventions.md `## Signing` (read the allowed signers file to check the key). Missing or mismatch → stop, tell user what to set.
2. **Unstage.** Staged files (`staged-names` non-empty) → `unstage`.
3. **Collect.** `status`; with `paths:`, keep only the entries under those paths and set the rest aside as `Excluded: pre-existing`. Nothing left → report "nothing to commit", `Result: nothing-to-do`, stop. Scratch = `scratch` (commit message and patch files).
4. **Classify.** Counts only: `numstat` (fails, e.g. no commits yet → analyzed) plus per untracked file `untracked-numstat`. Small = all of: ≤5 files; ≤150 added + deleted lines; no binary (`-` in numstat); no delete or rename (`D`, `R`); no secret-pattern file name (`.env*`, key files); no lockfile, CI, migration, or infra path (`*.lock`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `.github/`, `.gitlab-ci.yml`, `migrations/`, `Dockerfile*`, `docker-compose*`, Terraform); one top-level directory (root-level files count as one area); no grouping hints in the input. Else → analyzed. Small also needs no secret-pattern hit (Rules `Secrets`) in `diff-head` or the untracked files; any hit → analyzed.
5. **Branch guard.** Decide only; switch in step 8. Current = Context → Branch; `HEAD` (detached) → current = `detached@<sha>` (sha from `short-head`), counts as protected. Default = `default-branch` minus `origin/` (unset → `main`). Protected check per conventions.md `## Protected branch`. Current = default or protected → switch needed (`branch=yes` for step 6 analyzed); the target name comes from the analyzer (analyzed) or step 6 (small). Step 6 sets and checks it; step 7 shows it.
6. **Group.** Small: one group of every changed file, subject drafted here. Analyzed: spawn `cdk:change-analyzer` (`mode=group`), take `Groups`, `Split`, `Branch`, `Excluded`. Commitlint config exists → check each subject (cap in Rules). Switching → name the branch. Detail: `${CLAUDE_SKILL_DIR}/references/group.md`.
7. **Plan.** Show `Branch: <current> → <target>` (if switching), then per group subject + files, then `Excluded` files with a warning to the user. No prompt; continue to step 8.
8. **Commit.** Switching → `switch-branch` (name from step 6). Per group: whole files → `stage-files`; split files → `stage-patch` instead. Write subject to `<scratch>/msg`, then `commit` (never inline the subject in shell args). Failures: `${CLAUDE_SKILL_DIR}/references/failures.md`.
9. **Verify.** `verify-log`. Every `%G?` must be `G`; every subject ≤72 chars. `tree-status` shows only excluded files. Fail → step 11, then stop and report.
10. **Push.** `origin-url` fails → report "no origin remote", skip push, `Branch:` line says `not pushed`. Else `push`; use `push-upstream` when `upstream` fails or ≠ `origin/<branch>` (never follow an upstream like `origin/main`). Fail → report exact error line, run step 11, then stop.
11. **Resolve findings.** Per resolve-findings.md, only when a source holds an item; otherwise `Resolution: none` or `not run`. Detail: `${CLAUDE_SKILL_DIR}/references/resolve.md`.

## Output

```text
Path: small | analyzed
Branch: <branch> → <remote>/<branch> | not pushed
Switched from: <protected/default branch or none>
Commits:
- <hash> <subject> [signature: G]
Commitlint: pass | skipped (not installed) | fail (<error line>) | n/a
Excluded: <files or none>
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
