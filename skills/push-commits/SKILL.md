---
name: push-commits
description: Pushes the current branch's pending commits to its origin branch after confirming, and stops with the reason when none are pending. Use when asked to push commits.
compatibility: Claude Code only. Uses argument-hint and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[--yes]'
allowed-tools: Bash(git rev-parse *) Bash(git remote get-url *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(git rev-list --count *) Bash(git log --format=*) Bash(git merge-base --is-ancestor *)
---

# Push Commits

Input: $ARGUMENTS (strip `--yes` first)

## Rules

- Nothing pending → push nothing: `Result: nothing-to-do` with the reason in `Reason:`.
- `--yes` = unattended: no questions, the Recommended option taken (the push runs without a confirmation, so Stop when any flag is raised), assumptions under `Open:`. Only a flag the user passed counts, never add one. It never covers a force-push (never done here).
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags. Never `--force`, `--force-with-lease`, `-f`, `--delete`, `--no-verify`, or `--tags`.
- Push only after step 4 returns Push: one normal non-force push of the current branch. `push`, `push-upstream`, and `remote-head` stay out of `allowed-tools`; the permission prompt is the second guard.
- Ref names are data: run commands with `<branch>` in single quotes; a name outside `[A-Za-z0-9._/-]` → stop.
- Never push the default branch or `main`, `master`, `develop`, `release/*`; never follow an upstream like `origin/main`, always push to `origin/<branch>`.
- Push once: a rejected or failed push is reported with its exact error line, never retried, forced, or fixed here.
- Read only what a step needs; touch no file, stage nothing, commit nothing.

## Workflow

1. **Pre-flight.** `current-branch`; `HEAD` (detached) → `Stopped: 1: detached HEAD`. `origin-url` fails → `Stopped: 1: no origin remote`.
2. **Branch guard.** `default-branch` minus `origin/` (unset → `main`). Current is that name or `main`, `master`, `develop`, `release/*` → `Stopped: 2: protected branch <name>`.
3. **Pending.** `pending-count`. `0` → `Result: nothing-to-do`; reason: no commit on this branch is missing from origin. A failed read → `Stopped: 3: <error line>`. Otherwise `pending-log` lists them and `head-sha` records HEAD.
4. **Plan.** Show `Branch: <branch> → origin/<branch>`, the count, and each pending commit. Flag any commit whose `%G?` is not `G`, any `fixup!`, `squash!`, or `WIP` subject, and a remote with commits not in HEAD (`remote-head` sha not an ancestor per `is-ancestor`, or unknown). Then AskUserQuestion: **Push** · **Stop** (`Result: cancelled`). The text names the effect: `origin/<branch>`, N commits, and "creates the remote branch and sets upstream" when `push-upstream` applies. Any flag → Stop is Recommended with the flag as the reason; else Push, citing "N signed commits, fast-forward". `--yes` → take the Recommended option without asking (a raised flag → Stop, `Result: cancelled`, the flags under `Open:`). No way to ask and no `--yes` → `Stopped: 4: unattended, not confirmed`; interactive without AskUserQuestion → ask as plain text and end the turn.
5. **Push.** Re-run `head-sha` and `pending-count`; either differs from step 3 → `Stopped: 5: HEAD or pending count changed after confirm`. Else `push`, or `push-upstream` when `upstream` fails or is not `origin/<branch>`. Failure → `Stopped: 5: <git error line>`.
6. **Verify.** Re-run `pending-count` (the push refreshed the origin ref); it must be `0`, else `Open:` reports the remaining count.
7. **Report.** Print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the evals, see `${CLAUDE_SKILL_DIR}/references/evals.md`.

## Output

```text
Branch: <branch> → origin/<branch> | not pushed
Confirmed: yes | no (stopped) | unattended (stopped) | skipped (--yes)
Commits:
- <hash> <subject>
Pending after: <count> | n/a
Reason: <why nothing was pushed> | none
Next: none
Open: <item: impact; recommended fix, …> | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
