---
name: rebase-onto
description: Rebases the current branch onto the default or a named branch with signed commits, resolving each conflict with the user. Use only when the user explicitly asks to rebase or sync with main via rebase.
argument-hint: '[optional target branch]'
allowed-tools: Bash(git status *) Bash(git rev-parse *) Bash(git config --get *) Bash(git fetch --prune origin) Bash(git for-each-ref *) Bash(git symbolic-ref *) Bash(git log *) Bash(git show *) Bash(git diff *) Bash(git merge-base *) Bash(git rev-list *) Bash(git cherry *) Bash(glab mr list *) Bash(git rebase --abort) Bash(git rebase --skip) Bash(git -c core.editor=true rebase --continue) Bash(git checkout --ours *) Bash(git checkout --theirs *) Bash(git add *)
---

# Rebase Onto

Input: $ARGUMENTS

## Context

- Branch: !`git rev-parse --verify -q HEAD >/dev/null 2>&1 && git rev-parse --abbrev-ref HEAD || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent subagents in one parallel turn.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Rebase the current branch only. Never `--no-verify`, `--no-gpg-sign`, `--exec`, `-i`, `reset --hard`, or `push --force`. The only push form for rewritten history is `push-lease`, only when `upstream` = `origin/<current>`, after the step 7 confirmation; never a bare `git push --force-with-lease`.
- Rebased commits are re-signed: always exactly `rebase`, no other flags. `rebase` and every push stay out of `allowed-tools` (a `git rebase -S *` pattern would also match `-i` and `--exec`), so the permission prompt is a second guard.
- During a rebase `--ours` = `HEAD` (target plus your commits already replayed) and `--theirs` = the commit being replayed (`REBASE_HEAD`).
- `remove-file`, `keep-target`, `keep-mine`, and `rebase-abort` run only after the AskUserQuestion option that names the effect; an empty-commit `skip` runs without asking; `git rm` stays out of `allowed-tools`.
- Push is never automatic: always ask first.
- Conflict analysis: ≥3 conflicted files → one `cdk:conflict-analyzer` per file, ≤4 per message; fewer → inline. Agents only propose; every question and git write stays here.
- Caps: Revise loop 5 rounds per file; the conflict loop runs once per replayed commit. Cap hit or any later failure (signing, verify, push) → say the rebase is still in progress (`rebase-abort` undoes it), list the rest in `Open:`, and stop.
- Unattended (chained, no AskUserQuestion): ask nothing; stop at the first conflict or push decision and report it in `Open:`.

## Workflow

1. **Pre-flight.** Context → Branch, `status`, `dirty-tracked`, and signing checks; any failure → stop. Detail: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Pre-flight`.
2. **Remote branches.** `fetch`, then list candidates and the default; stop on failure or none (`flow.md` `## Remote branches`).
3. **Target.** The named branch, else the default; report `divergence` (`flow.md` `## Target`).
4. **Check.** Behind = 0 → `Result: nothing-to-do`. `merge-commits` non-empty → rebase with `--rebase-merges`, no question.
5. **Rebase.** `upstream` = `origin/<current>` → record `upstream-sha` (the lease). Run `rebase`; success → step 7.
6. **Conflict loop.** Per conflicted commit: analyze each file, ask, resolve, `continue` (`flow.md` `## Conflict loop`).
7. **Verify and push.** `status` clean and no rebase in progress; `signatures` all `G`. Ask, then push (`flow.md` `## Push`).
8. **Report.** List `Open:` per `flow.md` `## Open items`; print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For pre-flight, signing, target selection, the conflict loop, push, and open items, see `${CLAUDE_SKILL_DIR}/references/flow.md`.

## Output

```text
Rebased: <current> onto <target>
Commits replayed: <count> [signature: G]
Conflicts: <file — resolution> or none
Skipped: <commits or none>
Pushed: <remote>/<current> (force-with-lease | -u) | no
Open: <item: impact; command to run, …> | none
Next: /cdk:prepare-change-request | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
