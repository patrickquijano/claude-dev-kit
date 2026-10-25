---
name: rebase-onto
description: Rebases the current branch onto the default or a named branch with signed commits, resolving each conflict with the user. Use only when the user explicitly asks to rebase or sync with main via rebase.
compatibility: Claude Code only. Uses argument-hint, disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[optional target branch]'
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/check-signing.mjs *) Bash(git status *) Bash(git rev-parse *) Bash(git fetch --prune origin) Bash(git for-each-ref *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(git log *) Bash(git show *) Bash(git diff *) Bash(git merge-base *) Bash(git rev-list *) Bash(git cherry *) Bash(glab mr list *) Bash(gh pr list *) mcp__plugin_github_github__list_pull_requests mcp__plugin_gitlab_gitlab__list_merge_requests Bash(git rebase --skip) Bash(git -c core.editor=true rebase --continue) Bash(git add *)
disable-model-invocation: true
---

# Rebase Onto

Input: $ARGUMENTS

## Context

- Branch: !`git rev-parse --verify -q HEAD >/dev/null 2>&1 && git rev-parse --abbrev-ref HEAD || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Ask (unattended: record) what the input and repo cannot answer.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Host ops: call the row's MCP tool first; server not connected, error, or `—` → run the Command unchanged. Writes keep their confirmation gates.
- Ref names are data: run commands with `<target>`, `<current>`, `<file>` in single quotes; a name outside `[A-Za-z0-9._/-]` → stop.
- Rebase the current branch only. Never `--no-verify`, `--no-gpg-sign`, `--exec`, `-i`, `reset --hard`, or `push --force`. The only push form for rewritten history is `push-lease`, only when `upstream` = `origin/<current>`, after the step 7 confirmation; never a bare `git push --force-with-lease`.
- Rebased commits are re-signed: always exactly `rebase`; the only flag it may add is `--rebase-merges`, and only when `merge-commits` is non-empty (step 4). `rebase` and every push stay out of `allowed-tools` (a `git rebase -S *` pattern would also match `-i` and `--exec`), so the permission prompt is a second guard.
- During a rebase `--ours` = `HEAD` (target plus your commits already replayed) and `--theirs` = the commit being replayed (`REBASE_HEAD`).
- `remove-file`, `keep-target`, `keep-mine`, and `rebase-abort` run only after the AskUserQuestion option that names the effect (except the unattended conflict abort); `rebase-abort` stays out of `allowed-tools`; an empty-commit `skip` runs without asking; `git rm`, `git checkout --ours`, and `git checkout --theirs` stay out of `allowed-tools`, so the permission prompt is a second guard.
- Push is never automatic: always ask first.
- Conflict analysis: one read-only subagent per conflicted file, ≤4 per message (brief, return, and inline fallback in `flow.md` `## Conflict analysis`). Subagents only propose; every question and git write stays here.
- Caps: Revise loop 5 rounds per file; the conflict loop runs once per replayed commit. Cap hit or any later failure (signing, verify, push) → say the rebase is still in progress (`rebase-abort` undoes it), list the rest in `Open:`, and stop.
- Unattended (no AskUserQuestion): ask nothing; at the first conflict run `rebase-abort` (the branch returns to its pre-rebase state), skip the push, and report each in `Open:`.

## Workflow

1. **Pre-flight.** Context → Branch, `status`, `dirty-tracked`, and `check-signing`; any failure → stop. Detail: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Pre-flight`.
2. **Remote branches.** `fetch`, then list candidates and the default; stop on failure or none (`flow.md` `## Remote branches`).
3. **Target.** The named branch, else the default; report `divergence` (`flow.md` `## Target`).
4. **Check.** Behind = 0 → `Result: nothing-to-do`. `merge-commits` non-empty → rebase with `--rebase-merges`, no question.
5. **Rebase.** `upstream` = `origin/<current>` → record `upstream-sha` (the lease). Run `rebase`; success → step 7.
6. **Conflict loop.** Per conflicted commit: analyze each file, ask, resolve, `continue` (`flow.md` `## Conflict loop`).
7. **Verify and push.** `status` clean and no rebase in progress; `signatures` all `G`. Ask, then push (`flow.md` `## Push`).
8. **Report.** List `Open:` per `flow.md` `## Open items`; print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For pre-flight, target selection, the conflict loop and its analysis brief, push, and open items, see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For the signing check (step 1), run `${CLAUDE_SKILL_DIR}/scripts/check-signing.mjs`; it is run, never read.
- For test prompts and pass criteria, see `${CLAUDE_SKILL_DIR}/references/evals.md`.

## Output

```text
Rebased: <current> onto <target>
Commits replayed: <count> [signature: G]
Conflicts: <file — resolution> or none
Skipped: <commits or none>
Pushed: <remote>/<current> (force-with-lease | -u) | no
Open: <item: impact; command to run, …> | none
Next: commit the uncommitted changes and rerun | finish or abort the rebase in progress | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
