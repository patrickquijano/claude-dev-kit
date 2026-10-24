---
name: switch-branch
description: Derives a Conventional Branch name from the current commits and changes, switches to that new branch, and pushes it. Use only when the user explicitly asks to move their changes to a new branch.
argument-hint: '[optional branch hint or description]'
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git rev-parse *) Bash(git restore --staged *) Bash(git show-ref *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(git rev-list *) Bash(git remote get-url *)
---

# Switch Branch

Input: $ARGUMENTS

## Context

- Branch: !`git rev-parse --verify -q HEAD >/dev/null 2>&1 && git rev-parse --abbrev-ref HEAD || echo '<none>'`
- Origin: !`git remote get-url origin 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: `Result: stopped`) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`; each spawn gets a complete brief (agent, kind, literal inputs, scope, return block; missing or ambiguous → `Question:`, never assume).
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- The name follows `${CLAUDE_SKILL_DIR}/references/branch-name.md`.
- Analysis runs in `cdk:change-analyzer` (`mode=branch-name`) so large diffs stay out of this context. It cannot ask: relay its `Questions` with AskUserQuestion. Pass only root, `mode`, `base`, the input, and answers to earlier `Questions`.
- Always a new branch; uncommitted changes and commits carry over untouched. Never commit, stash, reset, or `--force`.
- Switch and push without asking; an explicit request to this skill, directly or by a chaining skill, is consent to a normal, non-force push. `switch`, `remote-branch-exists`, and `git push` stay out of `allowed-tools`, so the permission prompt is a second guard.
- Caps: analyzer respawn after `Questions` 1; name suffix search 10, then stop.
- Unattended (chained, no AskUserQuestion): ask nothing; switch and push proceed under the same consent, and an unanswerable `Questions` → `Result: stopped`.
- Chained by other skills through the Skill tool, so it never sets `disable-model-invocation`.

## Workflow

1. **Pre-flight.** `inside-work-tree` fails → stop. `status` shows a rebase, merge, or cherry-pick in progress → stop and tell the user to finish or abort it. Origin = Context → Origin; `<none>` → skip the remote check and the push.
2. **Unstage.** `staged-files` non-empty → `unstage`; a path both staged and modified (`MM` in `changes`) → first AskUserQuestion ("Unstage all (drops the staged split)", "Stop"); unattended unstages and notes it. Failure (no HEAD) → stop.
3. **Collect.** Current = Context → Branch; `HEAD` → `detached@` plus `short-head`. Base = `origin-head` when `verify-ref` resolves it, else the first that `verify-full-ref` resolves of `refs/remotes/origin/main`, `refs/remotes/origin/master`, `refs/heads/main`, `refs/heads/master`. Current equals the base's branch name → base = `origin/<name>` when that ref resolves, else no base. Count `unique-commits` (no base or failure → 0). `changes` empty, no commits, no input → `Result: nothing-to-do`.
4. **Analyze.** Spawn `cdk:change-analyzer` with root, `mode=branch-name`, `base` (`none` without one), and the input as hints. Take `Branch` and the `Changes` count; `Questions` → AskUserQuestion, then respawn once.
5. **Name.** `local-branch-exists` exit 0 or `remote-branch-exists` non-empty → append `-2`, `-3`, … (cap in Rules); an `ls-remote` error counts as not on remote.
6. **Switch and push.** Show `Branch: <current> → <name>` and a one-line reason. Run `switch`; failure → report the exact error line, stop. Then `push` (skip without origin); failure → report the exact error line, stop.
7. **Report.** Print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the branch name format, naming rule, and analyzer brief (step 4), see `${CLAUDE_SKILL_DIR}/references/branch-name.md`.

## Output

```text
Branch: <name> → origin/<name> | not pushed
Switched from: <previous branch>
Unstaged: <files or none>
Changes carried: <count> files
Commits carried: <count> | none
Next: /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
