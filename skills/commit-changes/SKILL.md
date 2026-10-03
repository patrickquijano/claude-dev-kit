---
name: commit-changes
description: Group uncommitted changes into atomic, signed Conventional Commits, switch off default/protected branches, and push after asking. Use only when the user explicitly asks to commit their changes, e.g. "commit and push", "commit my changes", "split this into atomic commits". Do not use on your own after finishing a task.
argument-hint: '[optional grouping hints]'
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git config --get *) Bash(git rev-parse *) Bash(git symbolic-ref *) Bash(git remote get-url *) Bash(git restore --staged *) Bash(mktemp *) Bash(git add *) Bash(git apply --cached *) Bash(git switch -c *) Bash(glab api --paginate projects/:id/protected_branches) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected)
---

# Commit Changes

Input: $ARGUMENTS

## Rules

- Subjects and branch names follow `${CLAUDE_SKILL_DIR}/conventions.md`. Repo has commitlint config → it is source of truth.
- Signed: always exactly `git commit -S -F <scratch>/msg`, no other flags. Never `--no-gpg-sign`, `--no-verify`, `-n`, `--amend`, `--force`. `git commit` stays out of `allowed-tools` (a `git commit -S -F *` pattern would also match `--no-verify`), so the permission prompt is a second guard.
- Commitlint config (`commitlint.config.*`, `.commitlintrc*`, or `commitlint` in `package.json`) → check each subject with `npx --no-install commitlint --edit <scratch>/msg` (permission-prompted: it runs repo config). Not installed (npx error, not a lint error) → skip check, note it.
- Commit without confirmation: local and reversible. Push only after the user picks Push to origin/<branch> in step 9: it publishes. `git push` stays out of `allowed-tools`, so the permission prompt is a second guard.
- Caps: hook-fix retries 3 per commit; commitlint redrafts 3 per subject. Cap hit → report, stop.
- Atomic: one logical change per commit. Group related files; config goes with the files it configures. Rename (`D` old + `??` new) stays in one commit.
- Secrets never committed: check file names (`.env`, keys) and diff content (`-----BEGIN`, `AKIA`, `ghp_`, `glpat-`, `xox[bp]-`). Match → leave unstaged, list under Excluded, warn user.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `commit-changes`.

## Workflow

1. **Pre-flight.** Signing per conventions.md `## Signing` (read the allowed signers file to check the key). Missing or mismatch → stop, tell user what to set.
2. **Unstage.** Staged files (`git diff --cached --name-only` non-empty) → `git restore --staged :/`.
3. **Collect.** `git status --porcelain=v1 -uall`, `git diff --stat`. Read diffs and new files enough to know each purpose. Nothing → report "nothing to commit", `Result: nothing-to-do`, stop. Scratch = `mktemp -d` (commit message and patch files).
4. **Branch guard.** Decide only; switch in step 7. Current = `git rev-parse --abbrev-ref HEAD`; `HEAD` (detached) → current = `detached@<git rev-parse --short HEAD>`, counts as protected. Default = `git symbolic-ref --short refs/remotes/origin/HEAD` minus `origin/` (unset → `main`). Protected check per conventions.md `## Protected branch`. Current = default or protected → target = new branch named from changes per conventions.md `## Branch name`. Step 6 shows it.
5. **Group.** Group changes into commits; draft one subject per group. Order groups so earlier commits never depend on later ones (tooling/config first). Honor input hints. One file mixes unrelated changes → split hunks: write group `<n>`'s hunks of `git diff <file>` to `<scratch>/<n>.patch` (stage nothing yet; step 7 applies it); else flag in plan. Commitlint config exists → per subject write `<scratch>/msg`, run the Rules check; fail → redraft from its error lines.
6. **Plan.** Show `Branch: <current> → <target>` (if switching), then per group subject + files. No prompt; continue to step 7.
7. **Commit.** Switching → `git switch -c <target>`; fail → report exact error line, stop. Per group: whole files → `git add -- <files>`; split files → `git apply --cached <scratch>/<n>.patch` instead of `git add`. Write subject to `<scratch>/msg`, then `git commit -S -F <scratch>/msg` (never inline the subject in shell args). Signing fails → stop per conventions.md `## Signing`. Other hook failure → diagnose root cause, fix, re-stage, commit again.
8. **Verify.** `git log --format='%h %G? %s' -n <count>`. Every `%G?` must be `G`; every subject ≤72 chars. `git status` shows only excluded files. Fail → stop, report.
9. **Push.** `git remote get-url origin` fails → report "no origin remote", skip push, `Branch:` line says `not pushed`. AskUserQuestion: Push to origin/<branch> (Recommended) | Don't push. Don't push → skip push, `Branch:` line says `not pushed`, `Result: done`. Push → `git push origin HEAD:<branch>`; add `-u` when `git rev-parse --abbrev-ref @{u}` fails or ≠ `origin/<branch>` (never follow an upstream like `origin/main`). Fail → report exact error line, stop.

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
