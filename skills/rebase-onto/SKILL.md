---
name: rebase-onto
description: Fetch remote branches, rebase the current branch onto the default branch (or one the user names) with signed commits, and resolve each conflict with the user. Use only when the user explicitly asks to rebase, e.g. "rebase onto main", "rebase my branch", "rebase on latest main", "sync my branch with main via rebase". Do not use on your own after finishing a task.
argument-hint: '[optional target branch]'
allowed-tools: Bash(git status *) Bash(git rev-parse *) Bash(git config --get *) Bash(git fetch --prune origin) Bash(git for-each-ref *) Bash(git symbolic-ref *) Bash(git log *) Bash(git show *) Bash(git diff *) Bash(git merge-base *) Bash(git rev-list *) Bash(git cherry *) Bash(glab mr list *) Bash(git rebase --abort) Bash(git rebase --skip) Bash(git -c core.editor=true rebase --continue) Bash(git checkout --ours *) Bash(git checkout --theirs *) Bash(git add *)
---

# Rebase Onto

Input: $ARGUMENTS

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Rebase current branch only. Never `--no-verify`, `--no-gpg-sign`, `--exec`, `-i`/`--interactive`, `reset --hard`, `push --force`. Only push form allowed for rewritten history: `push-lease`, only when `upstream` = `origin/<current>`, after step 8 confirmation; this is the one exception to the repo never-force-push rule. Never a bare `git push --force-with-lease` (it can follow an upstream like `origin/main`).
- Rebased commits re-signed: always exactly `rebase`, no other flags. It stays out of `allowed-tools` (a `git rebase -S *` pattern would also match `-i`/`--exec`), so the permission prompt is a second guard.
- During rebase, `--ours` = `HEAD` = target plus your commits already replayed, `--theirs` = user's commit being replayed (`REBASE_HEAD`).
- Push never automatic: always ask first. Push commands stay out of `allowed-tools` on purpose (second guard on history rewrite).
- Every `remove-file`, `keep-target`, `keep-mine`, and `rebase-abort` runs only after the AskUserQuestion option that names its effect; empty-commit `skip` (step 6) runs without asking; `git rm` stays out of `allowed-tools`.
- Conflict analysis: ≥3 conflicted files → one `cdk:conflict-analyzer` per file, spawned in batches of ≤4 in one message; fewer → analyze inline. Agents only propose; every AskUserQuestion and git write stays here.
- Caps: Revise loop 5 rounds per file; conflict loop runs once per replayed commit (bounded by the commit count). Cap hit → tell user the rebase is still in progress (`rebase-abort` undoes it), run step 9 once on what is left, then print the Output with `Stopped: <step>: <reason>`. Step 5 signing failure, step 7 verify failure, and step 8 push failure do the same. Steps 1–3 stops print `Resolution: not run (stopped)`; Abort rebase prints `not run (cancelled)`; step 4 prints `not run (nothing-to-do)`.
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/resolve-findings.md` (scope: ask-only; sources: `Skipped:` commits, `Conflicts:` resolutions that discarded changes, `Pushed: no`).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/known-issues.md` with slug `rebase-onto` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Pre-flight.** `current-branch`, `status`, `dirty-tracked`, and signing checks; any failure → stop. Detail: `${CLAUDE_SKILL_DIR}/references/preflight.md`.
2. **Remote branches.** `fetch`, then list candidates and the default; stop on failure or no candidates. Detail: `${CLAUDE_SKILL_DIR}/references/preflight.md`.
3. **Target.** No ask: named branch, else the default; report `divergence`. Detail: `${CLAUDE_SKILL_DIR}/references/preflight.md`.
4. **Check.** Behind = 0 → report "already up to date", `Result: nothing-to-do`, stop. `merge-commits` non-empty → keep merges with `--rebase-merges` (preserves history shape), no ask.
5. **Rebase.** `upstream` = `origin/<current>` → record `upstream-sha` as the pre-rebase sha (step 8 lease). `rebase`. Success → step 7. Fails on signing → stop per conventions.md `## Signing`; tell user the rebase is still in progress (`rebase-abort` undoes it); step 9, then `Stopped:`.
6. **Conflict loop.** Per conflicted commit: analyze each file, ask the user, resolve, `continue`; repeat until done. Detail: `${CLAUDE_SKILL_DIR}/references/conflicts.md`.
7. **Verify.** `status` clean, no rebase in progress. `signatures`: every `%G?` = `G`. Fail → report, step 9, then `Stopped:`.
8. **Push.** Always ask first; `push-lease` only when `upstream` = `origin/<current>`. Detail: `${CLAUDE_SKILL_DIR}/references/push.md`.
9. **Resolve findings.** Per resolve-findings.md. Never edit code or redo the rebase here (history rewrites already had explicit asks); per item give impact, the recommended follow-up, and the command for the user to run.

## Output

```text
Rebased: <current> onto <target>
Commits replayed: <count> [signature: G]
Conflicts: <file — resolution> or none
Skipped: <commits or none>
Pushed: <remote>/<current> (force-with-lease | -u) | no
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
