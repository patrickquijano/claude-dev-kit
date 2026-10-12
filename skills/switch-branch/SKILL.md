---
name: switch-branch
description: Unstage staged files, derive a Conventional Branch name from the commits unique to the current branch, the uncommitted changes, and optional input, switch to that new branch, and push it. Use only when the user explicitly asks to create/switch to a branch for their changes, e.g. "branch these changes", "switch to a new branch and push", "move my changes to a new branch", "put this on a feature branch". Do not use on your own after finishing a task.
argument-hint: '[optional branch hint or description]'
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git rev-parse *) Bash(git restore --staged *) Bash(git show-ref *) Bash(git symbolic-ref *) Bash(git rev-list *) Bash(git ls-remote *) Bash(git remote get-url *) Bash(git switch -c *)
---

# Switch Branch

Input: $ARGUMENTS

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Name follows `${CLAUDE_SKILL_DIR}/../commit-changes/references/conventions.md` `## Branch name`.
- Analysis in subagent: step 4 spawns `cdk:change-analyzer` (`mode=branch-name`) to read the diffs and draft the name, so large diffs stay out of this context. It cannot ask; relay its `Questions` with AskUserQuestion. Pass only root, `mode`, `base`, input, answers to earlier `Questions`, and the conventions path.
- Naming: input wins; otherwise the Conventional Commit type, scope, and intent of the commits unique to the current branch and the uncommitted changes are weighed together. Commits are read only; the new branch starts at `HEAD`, so they carry over.
- Always new branch; uncommitted changes carry over untouched. Never commit, stash, reset, or `--force`.
- Switch and push without asking; the request to switch counts as consent to a normal push. `git push` stays out of `allowed-tools`, so the permission prompt is a second guard.
- Caps: analyzer respawn after `Questions` 1; name suffix search max 10, then stop.
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/fallbacks.md`.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/known-issues.md` with slug `switch-branch` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Pre-flight.** `inside-work-tree` fails → stop ("not a git repository"). `status` shows a rebase, merge, or cherry-pick in progress → stop, tell user to finish or abort it. Origin = `origin-url` succeeds; fails → no origin: step 5 skips the remote check, step 8 skips push.
2. **Unstage.** Staged files (`staged-files` non-empty) → `unstage`. Fails (no HEAD, unborn branch) → report, stop.
3. **Collect.** Current = `current-branch`; `HEAD` (detached) → `detached@` plus `short-head`. Base = `origin-head` when that ref resolves (`verify-ref`); else the first that resolves of `refs/remotes/origin/main`, `refs/remotes/origin/master`, `refs/heads/main`, `refs/heads/master` (`verify-full-ref`), shown without `refs/…/`. Current equals the base's branch name (base minus `origin/`) → base = `origin/<name>` when that remote-tracking ref resolves (the unpushed commits), else no base. None resolves, or `rev-parse`/`rev-list` fails (unborn HEAD) → no base, 0 commits. Unique commits = `unique-commits`. `changes` empty, no unique commits, and no input → report "nothing to branch", `Result: nothing-to-do`, stop.
4. **Analyze.** Spawn `cdk:change-analyzer` with root, `mode=branch-name`, `base=<base>` (`none` with no base), `$ARGUMENTS` as hints (input wins over commits and changes on a type or description conflict), and `${CLAUDE_SKILL_DIR}/../commit-changes/references/conventions.md`. Take `Branch` (name + reason) and the `Changes` count (for `Changes carried`; `none` → 0); `Commits carried` is the step 3 count (the agent's `Commits` line is informational); `Questions` non-empty → AskUserQuestion, then respawn once with the answers.
5. **Name.** Use the analyzer's name. Exists (`local-branch-exists` exit 0, or `remote-branch-exists` non-empty) → append `-2`, `-3`, …. `ls-remote` error → treat as not on remote; push step reports real failure.
6. **Show.** Show `Branch: <current> → <name>` + one-line reason; no confirmation.
7. **Switch.** `switch`; fail → report exact error line, stop (nothing pushed).
8. **Push.** No origin → skip. `push` without asking; fail → report exact error line, stop.

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
