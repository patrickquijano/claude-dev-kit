---
name: switch-branch
description: Unstage staged files, derive a Conventional Branch name from uncommitted changes and optional input, switch to that new branch, and push it. Use only when the user explicitly asks to create/switch to a branch for their changes, e.g. "branch these changes", "switch to a new branch and push", "move my changes to a new branch", "put this on a feature branch". Do not use on your own after finishing a task.
argument-hint: '[optional branch hint or description]'
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git rev-parse *) Bash(git restore --staged *) Bash(git show-ref *) Bash(git ls-remote *) Bash(git remote get-url *) Bash(git switch -c *)
---

# Switch Branch

Input: $ARGUMENTS

## Rules

- Name follows `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` `## Branch name`.
- Always new branch; uncommitted changes carry over untouched. Never commit, stash, reset, or `--force`.
- Push only after the step 6 option that names it. `git push` stays out of `allowed-tools`, so the permission prompt is a second guard.
- Step 6 Revise loop capped at 5 rounds; cap hit → stop, report.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `switch-branch`.

## Workflow

1. **Pre-flight.** `git rev-parse --is-inside-work-tree` fails → stop ("not a git repository"). `git status` shows a rebase, merge, or cherry-pick in progress → stop, tell user to finish or abort it. Origin = `git remote get-url origin` succeeds; fails → no origin: step 5 skips the remote check, step 6 drops push options.
2. **Unstage.** Staged files (`git diff --cached --name-only` non-empty) → `git restore --staged :/`. Fails (no HEAD, unborn branch) → report, stop.
3. **Collect.** Current = `git rev-parse --abbrev-ref HEAD`; `HEAD` (detached) → `detached@<git rev-parse --short HEAD>`. Collect: `git status --porcelain=v1 -uall`, `git diff --stat`. Read diffs and new files enough to know purpose. No changes and no input → report "nothing to branch", `Result: nothing-to-do`, stop.
4. **Intent.** Input present → analyze intent; input wins over changes on type/description conflict.
5. **Name.** Draft name from steps 3–4: dominant change type + imperative summary. Exists (`git show-ref --verify --quiet refs/heads/<name>` exit 0, or `git ls-remote --heads origin refs/heads/<name>` non-empty) → append `-2`, `-3`, …. `ls-remote` error → treat as not on remote; push step reports real failure.
6. **Confirm.** Show `Branch: <current> → <name>` + one-line reason. AskUserQuestion: Switch + push (Recommended) | Switch, no push | Revise | Cancel; no origin → Switch (Recommended) | Revise | Cancel. Revise → take user name or redraft, re-check rules + existence (step 5), back to step 6. Cancel → stop, nothing switched or pushed, `Result: cancelled`.
7. **Switch.** `git switch -c <name>`; fail → report exact error line, stop (nothing pushed).
8. **Push.** Switch + push → `git push -u origin <name>`. Fail → report exact error line, stop.

## Output

```text
Branch: <name> → origin/<name> | not pushed
Switched from: <previous branch>
Unstaged: <files or none>
Changes carried: <count> files
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
