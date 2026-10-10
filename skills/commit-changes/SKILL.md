---
name: commit-changes
description: Group uncommitted changes into atomic, signed Conventional Commits, switch off default/protected branches, and push. Use only when the user explicitly asks to commit their changes, e.g. "commit and push", "commit my changes", "split this into atomic commits". Also runs when the cdk Stop hook instructs it. Do not use on your own after finishing a task.
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
- Caps: hook-fix retries 3 per commit; commitlint redrafts 3 per subject (small path included); analyzer respawn after `Questions` 1; branch-name suffix search max 10. Cap hit → report, stop.
- Two paths, chosen by step 4 from counts plus a secret-pattern scan, never from reading diffs for meaning: small = main thread, no subagent, no AskUserQuestion, only the path-and-numstat type rule; analyzed = step 6 spawns `cdk:change-analyzer` (`mode=group`) so large diffs stay out of this context. It cannot ask; relay its `Questions` with AskUserQuestion. Pass only root, hints, `branch=yes|no`, answers to earlier `Questions`, commitlint error lines, and the conventions path. Any doubt → analyzed.
- Atomic: one logical change per commit. Group related files; config goes with the files it configures. Rename (`D` old + `??` new) stays in one commit.
- Secrets never committed: the analyzer (small path: step 4) flags file names (`.env`, keys) and diff content (`-----BEGIN`, `AKIA`, `ghp_`, `glpat-`, `xox[bp]-`) under `Excluded`. Flagged → leave unstaged, list under Excluded, warn user.
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: ask-only; sources: `Excluded:` secret-flagged files, a skipped commitlint check, `Branch:` `not pushed` with no origin).
- Unattended when run by the cdk `Stop` hook or chained by another skill: it asks nothing, and step 11 only reports open items with their recommended fix.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `commit-changes`.

## Workflow

1. **Pre-flight.** Signing per conventions.md `## Signing` (read the allowed signers file to check the key). Missing or mismatch → stop, tell user what to set.
2. **Unstage.** Staged files (`git diff --cached --name-only` non-empty) → `git restore --staged :/`.
3. **Collect.** `git status --porcelain=v1 -uall`. Nothing → report "nothing to commit", `Result: nothing-to-do`, stop. Scratch = `mktemp -d` (commit message and patch files).
4. **Classify.** Counts only: `git diff HEAD --numstat` (fails, e.g. no commits yet → analyzed) plus per untracked file `git diff --no-index --numstat -- /dev/null <file>`. Small = all of: ≤5 files; ≤150 added + deleted lines; no binary (`-` in numstat); no delete or rename (`D`, `R`); no secret-pattern file name (`.env*`, key files); no lockfile, CI, migration, or infra path (`*.lock`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `.github/`, `.gitlab-ci.yml`, `migrations/`, `Dockerfile*`, `docker-compose*`, Terraform); one top-level directory (root-level files count as one area); no grouping hints in the input. Else → analyzed. Small also needs no secret-pattern hit (Rules `Secrets`) in `git diff HEAD` or the untracked files; any hit → analyzed.
5. **Branch guard.** Decide only; switch in step 8. Current = `git rev-parse --abbrev-ref HEAD`; `HEAD` (detached) → current = `detached@<git rev-parse --short HEAD>`, counts as protected. Default = `git symbolic-ref --short refs/remotes/origin/HEAD` minus `origin/` (unset → `main`). Protected check per conventions.md `## Protected branch`. Current = default or protected → switch needed (`branch=yes` for step 6 analyzed); the target name comes from the analyzer (analyzed) or step 6 (small). Step 6 sets and checks it; step 7 shows it.
6. **Group.** Small: one group of every changed file, no `Split`, no `Excluded`. Subject drafted here per conventions.md: type from paths (`docs` for `*.md`/docs only, `test` for test files only, `ci` for CI files, `build` for manifests/build config only, `chore` for other config, else `feat` for added functionality or `fix` for corrective changes judged from the file names and numstat; unsure → `chore`), optional single-area scope, imperative summary of the files touched. Switching → branch `<type>/<short-description>` from the same type and summary. Commitlint config exists → write `<scratch>/msg`, run the Rules check; fail → redraft from the error lines (cap in Rules). Analyzed: spawn `cdk:change-analyzer` with root, `mode=group`, `branch=<yes if step 5 needs a switch, else no>`, input hints, and `${CLAUDE_SKILL_DIR}/conventions.md`. Take `Groups`, `Split`, `Branch`, `Excluded` from its return; `Questions` non-empty → AskUserQuestion, then respawn once with the answers. Group order and subjects are final unless commitlint fails. One file mixes unrelated changes (`Split`) → write group `<n>`'s hunks of `git diff <file>` to `<scratch>/<n>.patch` using the returned `@@` headers (stage nothing yet; step 8 applies it). Commitlint config exists → per subject write `<scratch>/msg`, run the Rules check; fail → respawn with `mode=group`, the prior `Groups`, `Split`, and `Excluded`, and the error lines, so it redrafts only the failing subjects and keeps grouping and order (cap in Rules). Write the `.patch` files only after every subject passes. Switching → name the branch from `Branch` (analyzed) or the small-path name; exists (`git show-ref --verify --quiet refs/heads/<name>` exit 0, or `git ls-remote --heads origin refs/heads/<name>` non-empty; `ls-remote` error → not on remote) → append `-2`, `-3`, … (cap in Rules).
7. **Plan.** Show `Branch: <current> → <target>` (if switching), then per group subject + files, then `Excluded` files with a warning to the user. No prompt; continue to step 8.
8. **Commit.** Switching → `git switch -c <target>` (name from step 6); fail → report exact error line, stop. Per group: whole files → `git add -- <files>`; split files → `git apply --cached <scratch>/<n>.patch` instead of `git add`. Write subject to `<scratch>/msg`, then `git commit -S -F <scratch>/msg` (never inline the subject in shell args). Signing fails → stop per conventions.md `## Signing`. Other hook failure → diagnose root cause, fix, re-stage, commit again.
9. **Verify.** `git log --format='%h %G? %s' -n <count>`. Every `%G?` must be `G`; every subject ≤72 chars. `git status` shows only excluded files. Fail → stop, report.
10. **Push.** `git remote get-url origin` fails → report "no origin remote", skip push, `Branch:` line says `not pushed`. Else `git push origin HEAD:<branch>`; add `-u` when `git rev-parse --abbrev-ref @{u}` fails or ≠ `origin/<branch>` (never follow an upstream like `origin/main`). Fail → report exact error line, stop.
11. **Resolve findings.** Per resolve-findings.md, only when a source holds an item (`Excluded:` secret-flagged files, a skipped commitlint check, `not pushed` with no origin); otherwise skip it and print `Resolution: none`. Runs after a stop from step 9 onward (pre-flight stops and cancels print `not run`). Ask nothing and never edit, stage, or push anything here; report each item's impact, who acts (the user), and recommended fix. A skipped commitlint check is read from the "note it" report of that skip.

## Output

```text
Path: small | analyzed
Branch: <branch> → <remote>/<branch> | not pushed
Switched from: <protected/default branch or none>
Commits:
- <hash> <subject> [signature: G]
Excluded: <files or none>
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
