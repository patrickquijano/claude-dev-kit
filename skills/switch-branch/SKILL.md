---
name: switch-branch
description: Derives a Conventional Branch name from the input, or from the commits and changes when none is given, switches to that new branch, and pushes it. Use when asked to move changes to a new branch.
compatibility: Claude Code only. Uses argument-hint and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[--yes] [branch name or description]'
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/branch-name.mjs *) Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git rev-parse *) Bash(git show-ref *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(git rev-list *) Bash(git remote get-url *)
---

# Switch Branch

Input: $ARGUMENTS (strip `--yes` first)

## Context

- Branch: !`git rev-parse --verify -q HEAD >/dev/null 2>&1 && git rev-parse --abbrev-ref HEAD || echo '<none>'`
- Origin: !`git remote get-url origin 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Ask what the input and repo cannot answer (`--yes` or no AskUserQuestion: `Result: stopped`).
- Flags: `--yes` = unattended (no questions, recommended options, assumptions under `Open:`): unstage and switch proceed because the request names the move, the push is skipped (`not pushed`), and an unanswerable `Question` → `Result: stopped`. Only a flag the user passed counts, never add one. `--yes` never covers a destructive step: it is asked, or skipped and listed under `Open:`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- The name follows `${CLAUDE_SKILL_DIR}/references/branch-name.md`; uniqueness and format checks belong to `${CLAUDE_SKILL_DIR}/scripts/branch-name.mjs`, never done by hand.
- Analysis runs in a read-only subagent so large diffs stay out of this context (step 3; brief and fallback in `branch-name.md`), only when the input is empty or leaves the type open. It cannot ask: relay its `Question` with AskUserQuestion. Pass only root, base, the input, and answers to earlier `Question`.
- Always a new branch; uncommitted changes and commits carry over untouched. Never commit, stash, reset, or `--force`.
- One confirmation (step 5) before any change (unstage, switch, push); nothing changes before it. `unstage`, `switch`, and `git push` stay out of `allowed-tools`, so the permission prompt is a second guard.
- Caps: analyzer respawn after `Question` 1; name suffix search 10 (inside `branch-name.mjs`), then stop.

## Workflow

1. **Pre-flight.** `inside-work-tree` fails → stop. `status` shows a rebase, merge, or cherry-pick in progress → stop and tell the user to finish or abort it. Origin = Context → Origin; `<none>` → skip the remote check and the push.
2. **Collect.** Current = Context → Branch; `HEAD` → `detached@` plus `short-head`. Base = `origin-head` when `verify-ref` resolves it, else the first that `verify-full-ref` resolves of `refs/remotes/origin/main`, `refs/remotes/origin/master`, `refs/heads/main`, `refs/heads/master`. Current equals the base's branch name → base = `origin/<name>` when that ref resolves, else no base. Count `unique-commits` (no base or failure → 0). `changes` empty, no commits, no input → `Result: nothing-to-do`.
3. **Analyze.**
   - Empty input → spawn the read-only analyzer (fallback: `cdk:change-analyzer`) per `${CLAUDE_SKILL_DIR}/references/branch-name.md` `## Spawn brief` with root, `base` (`none` without one), and `input=none`: the name comes from the commits unique to the branch and the uncommitted changes.
   - Non-empty input → interpret it per `branch-name.md` `## Input`. A full name → use it normalized, no spawn. A description with a clear type → name it inline, no spawn. A description with the type open → spawn the analyzer with `input=<text>` (the input fixes the description; diffs set the type only). Intent unclear → AskUserQuestion (`--yes`: `Result: stopped`).
   - Take `Branch` and `Changes`; `Question` → AskUserQuestion, then respawn once. Unavailable or malformed twice → derive them inline per `## Inline analysis`. Without a spawn, `Changes` = the `changes` count.
4. **Name.** Run `free-name` with the analyzer's name (`--no-remote` without origin). Exit 1 → `Result: stopped` with its message.
5. **Confirm.** Show `Branch: <current> → <name>`, a one-line reason naming its source (`from input` | `from input + changes (type)` | `from changes`, plus any input normalization), and each effect: unstage (staged files from `staged-files`, naming any `MM` file whose staged split is dropped), switch, push. Ask once: `Switch + push (Recommended)` | `Switch only` | `Stop` (`Result: cancelled`, nothing changed). Without origin, only `Switch only` | `Stop`. `--yes`: `Switch only` without asking.
6. **Switch and push.** `staged-files` non-empty → `unstage`; failure (no HEAD) → stop. Run `switch`; failure → report the exact error line, stop. Then `push` when chosen; failure → report the exact error line, stop.
7. **Report.** Print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the branch name format, naming rule, analyzer brief and its inline fallback (step 3), see `${CLAUDE_SKILL_DIR}/references/branch-name.md`.
- For the name format and free-name check (step 4), run `${CLAUDE_SKILL_DIR}/scripts/branch-name.mjs`; it is run, never read.
- For test prompts and pass criteria, see `${CLAUDE_SKILL_DIR}/references/evals.md`.

## Output

```text
Branch: <name> → origin/<name> | not pushed
Switched from: <previous branch>
Unstaged: <files or none>
Changes carried: <count> files
Commits carried: <count> | none
Next: commit the carried changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
