---
name: switch-branch
description: Unstage staged files, derive a Conventional Branch name from the commits unique to the current branch, the uncommitted changes, and optional input, switch to that new branch, and push it. Use only when the user explicitly asks to create/switch to a branch for their changes, e.g. "branch these changes", "switch to a new branch and push", "move my changes to a new branch", "put this on a feature branch". Do not use on your own after finishing a task.
argument-hint: '[optional branch hint or description]'
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git rev-parse *) Bash(git restore --staged *) Bash(git show-ref *) Bash(git symbolic-ref *) Bash(git rev-list *) Bash(git ls-remote *) Bash(git remote get-url *) Bash(git switch -c *)
---

# Switch Branch

Input: $ARGUMENTS

## Context

- Branch: !`git rev-parse --verify -q HEAD >/dev/null 2>&1 && git rev-parse --abbrev-ref HEAD || echo '<none>'`
- Origin: !`git remote get-url origin 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- The name follows `${CLAUDE_SKILL_DIR}/references/branch-name.md`.
- Analysis runs in `cdk:change-analyzer` (`mode=branch-name`) so large diffs stay out of this context. It cannot ask: relay its `Questions` with AskUserQuestion. Pass only root, `mode`, `base`, the input, and answers to earlier `Questions`.
- Always a new branch; uncommitted changes and commits carry over untouched. Never commit, stash, reset, or `--force`.
- Switch and push without asking; the request to switch is consent to a normal push. `git push` stays out of `allowed-tools`, so the permission prompt is a second guard.
- Caps: analyzer respawn after `Questions` 1; name suffix search 10, then stop.
- Unattended (chained, no AskUserQuestion): ask nothing; an unanswerable `Questions` → `Result: stopped`.
- Chained by other skills through the Skill tool, so it never sets `disable-model-invocation`.

## Workflow

1. **Pre-flight.** `inside-work-tree` fails → stop. `status` shows a rebase, merge, or cherry-pick in progress → stop and tell the user to finish or abort it. Origin = Context → Origin; `<none>` → skip the remote check and the push.
2. **Unstage.** `staged-files` non-empty → `unstage`; failure (no HEAD) → stop.
3. **Collect.** Current = Context → Branch; `HEAD` → `detached@` plus `short-head`. Base = `origin-head` when `verify-ref` resolves it, else the first that `verify-full-ref` resolves of `refs/remotes/origin/main`, `refs/remotes/origin/master`, `refs/heads/main`, `refs/heads/master`. Current equals the base's branch name → base = `origin/<name>` when that ref resolves, else no base. Count `unique-commits` (no base or failure → 0). `changes` empty, no commits, no input → `Result: nothing-to-do`.
4. **Analyze.** Spawn `cdk:change-analyzer` with root, `mode=branch-name`, `base` (`none` without one), and the input as hints. Take `Branch` and the `Changes` count; `Questions` → AskUserQuestion, then respawn once.
5. **Name.** `local-branch-exists` exit 0 or `remote-branch-exists` non-empty → append `-2`, `-3`, … (cap in Rules); an `ls-remote` error counts as not on remote.
6. **Switch and push.** Show `Branch: <current> → <name>` and a one-line reason. Run `switch`; failure → report the exact error line, stop. Then `push` (skip without origin); failure → report the exact error line, stop.
7. **Report.** Print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the branch name format and naming rule, see `${CLAUDE_SKILL_DIR}/references/branch-name.md`.

## Output

```text
Branch: <name> → origin/<name> | not pushed
Switched from: <previous branch>
Unstaged: <files or none>
Changes carried: <count> files
Commits carried: <count> | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
