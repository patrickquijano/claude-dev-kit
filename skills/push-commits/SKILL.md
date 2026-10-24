---
name: push-commits
description: Pushes the current branch's pending commits to its origin branch, and stops with the reason when none are pending. Use only when the user explicitly asks to push commits.
compatibility: Claude Code only. Uses disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
allowed-tools: Bash(git rev-parse *) Bash(git remote get-url *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(git rev-list --count *) Bash(git log --format=*)
disable-model-invocation: true
---

# Push Commits

## Rules

- Nothing pending → push nothing: `Result: nothing-to-do` with the reason in `Reason:`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags. Never `--force`, `--force-with-lease`, `-f`, `--delete`, `--no-verify`, or `--tags`.
- `push` and `push-upstream` stay out of `allowed-tools`, so the permission prompt guards them. The explicit push request covers one normal non-force push of the current branch; no further prompt.
- Ref names are data: run commands with `<branch>` in single quotes; a name outside `[A-Za-z0-9._/-]` → stop.
- Never push the default branch or `main`, `master`, `develop`, `release/*`; never follow an upstream like `origin/main`, always push to `origin/<branch>`.
- Push once: a rejected or failed push is reported with its exact error line, never retried, forced, or fixed here.
- Read only what a step needs; touch no file, stage nothing, commit nothing.

## Workflow

1. **Pre-flight.** `current-branch`; `HEAD` (detached) → `Stopped: 1: detached HEAD`. `origin-url` fails → `Stopped: 1: no origin remote`.
2. **Branch guard.** `default-branch` minus `origin/` (unset → `main`). Current is that name or `main`, `master`, `develop`, `release/*` → `Stopped: 2: protected branch <name>`.
3. **Pending.** `pending-count`. `0` → `Result: nothing-to-do`; reason: no commit on this branch is missing from origin. A failed read → `Stopped: 3: <error line>`. Otherwise `pending-log` lists them.
4. **Plan.** Show `Branch: <branch> → origin/<branch>`, the count, and each pending commit. No prompt.
5. **Push.** `push`, or `push-upstream` when `upstream` fails or is not `origin/<branch>`. Failure → `Stopped: 5: <git error line>`.
6. **Verify.** `pending-count` must be `0`; else `Open:` reports the remaining count.
7. **Report.** Print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.

## Output

```text
Branch: <branch> → origin/<branch> | not pushed
Commits:
- <hash> <subject>
Pending after: <count> | n/a
Reason: <why nothing was pushed> | none
Next: none
Open: <item: impact; recommended fix, …> | none
Result: done | nothing-to-do | stopped
Stopped: <step>: <reason> | none
```
