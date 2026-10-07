---
name: commit-changes
description: Group uncommitted changes into atomic, signed Conventional Commits, switch off default/protected branches, and push. Use only when the user explicitly asks to commit their changes, e.g. "commit and push", "commit my changes", "split this into atomic commits". Do not use on your own after finishing a task.
argument-hint: '[optional grouping hints]'
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git config --get *) Bash(git rev-parse *) Bash(git symbolic-ref *) Bash(git remote get-url *) Bash(git restore --staged *) Bash(mktemp *) Bash(git add *) Bash(git apply --cached *) Bash(git switch -c *) Bash(glab api --paginate projects/:id/protected_branches) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected) Bash(git show-ref *) Bash(git ls-remote *)
---

# Commit Changes

Input: $ARGUMENTS

## Rules

- Subjects and branch names follow `${CLAUDE_SKILL_DIR}/conventions.md`. Repo has commitlint config → it is source of truth.
- Signed: always exactly `git commit -S -F <scratch>/msg`, no other flags. Never `--no-gpg-sign`, `--no-verify`, `-n`, `--amend`, `--force`. `git commit` stays out of `allowed-tools` (a `git commit -S -F *` pattern would also match `--no-verify`), so the permission prompt is a second guard.
- Commitlint config (`commitlint.config.*`, `.commitlintrc*`, or `commitlint` in `package.json`) → check each subject with `npx --no-install commitlint --edit <scratch>/msg` (permission-prompted: it runs repo config). Not installed (npx error, not a lint error) → skip check, note it.
- Commit and push without confirmation. `git push` stays out of `allowed-tools`, so the permission prompt guards the publish.
- Caps: hook-fix retries 3 per commit; commitlint redrafts 3 per subject; analyzer respawn after `Questions` 1; branch-name suffix search max 10. Cap hit → report, stop.
- Analysis in subagent: step 5 spawns `cdk:change-analyzer` (`mode=group`) to read the diffs and draft groups, so large diffs stay out of this context. It cannot ask; relay its `Questions` with AskUserQuestion. Pass only root, hints, `branch=yes|no`, answers to earlier `Questions`, commitlint error lines, and the conventions path.
- Atomic: one logical change per commit. Group related files; config goes with the files it configures. Rename (`D` old + `??` new) stays in one commit.
- Secrets never committed: the analyzer flags file names (`.env`, keys) and diff content (`-----BEGIN`, `AKIA`, `ghp_`, `glpat-`, `xox[bp]-`) under `Excluded`. Flagged → leave unstaged, list under Excluded, warn user.
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `commit-changes`.

## Workflow

1. **Pre-flight.** Signing per conventions.md `## Signing` (read the allowed signers file to check the key). Missing or mismatch → stop, tell user what to set.
2. **Unstage.** Staged files (`git diff --cached --name-only` non-empty) → `git restore --staged :/`.
3. **Collect.** `git status --porcelain=v1 -uall`. Nothing → report "nothing to commit", `Result: nothing-to-do`, stop. Scratch = `mktemp -d` (commit message and patch files).
4. **Branch guard.** Decide only; switch in step 7. Current = `git rev-parse --abbrev-ref HEAD`; `HEAD` (detached) → current = `detached@<git rev-parse --short HEAD>`, counts as protected. Default = `git symbolic-ref --short refs/remotes/origin/HEAD` minus `origin/` (unset → `main`). Protected check per conventions.md `## Protected branch`. Current = default or protected → switch needed (`branch=yes` for step 5); the target name comes from the analyzer. Step 5 sets and checks it; step 6 shows it.
5. **Group.** Spawn `cdk:change-analyzer` with root, `mode=group`, `branch=<yes if step 4 needs a switch, else no>`, input hints, and `${CLAUDE_SKILL_DIR}/conventions.md`. Take `Groups`, `Split`, `Branch`, `Excluded` from its return; `Questions` non-empty → AskUserQuestion, then respawn once with the answers. Group order and subjects are final unless commitlint fails. One file mixes unrelated changes (`Split`) → write group `<n>`'s hunks of `git diff <file>` to `<scratch>/<n>.patch` using the returned `@@` headers (stage nothing yet; step 7 applies it). Commitlint config exists → per subject write `<scratch>/msg`, run the Rules check; fail → respawn with `mode=group`, the prior `Groups`, `Split`, and `Excluded`, and the error lines, so it redrafts only the failing subjects and keeps grouping and order (cap in Rules). Write the `.patch` files only after every subject passes. Switching → name the branch from `Branch`; exists (`git show-ref --verify --quiet refs/heads/<name>` exit 0, or `git ls-remote --heads origin refs/heads/<name>` non-empty; `ls-remote` error → not on remote) → append `-2`, `-3`, … (cap in Rules).
6. **Plan.** Show `Branch: <current> → <target>` (if switching), then per group subject + files, then `Excluded` files with a warning to the user. No prompt; continue to step 7.
7. **Commit.** Switching → `git switch -c <target>` (name from step 5); fail → report exact error line, stop. Per group: whole files → `git add -- <files>`; split files → `git apply --cached <scratch>/<n>.patch` instead of `git add`. Write subject to `<scratch>/msg`, then `git commit -S -F <scratch>/msg` (never inline the subject in shell args). Signing fails → stop per conventions.md `## Signing`. Other hook failure → diagnose root cause, fix, re-stage, commit again.
8. **Verify.** `git log --format='%h %G? %s' -n <count>`. Every `%G?` must be `G`; every subject ≤72 chars. `git status` shows only excluded files. Fail → stop, report.
9. **Push.** `git remote get-url origin` fails → report "no origin remote", skip push, `Branch:` line says `not pushed`. Else `git push origin HEAD:<branch>`; add `-u` when `git rev-parse --abbrev-ref @{u}` fails or ≠ `origin/<branch>` (never follow an upstream like `origin/main`). Fail → report exact error line, stop.

## Output

```text
Branch: <branch> → <remote>/<branch> | not pushed
Switched from: <protected/default branch or none>
Commits:
- <hash> <subject> [signature: G]
Excluded: <files or none>
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
