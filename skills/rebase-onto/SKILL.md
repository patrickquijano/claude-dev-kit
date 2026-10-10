---
name: rebase-onto
description: Fetch remote branches, rebase the current branch onto the default branch (or one the user names) with signed commits, and resolve each conflict with the user. Use only when the user explicitly asks to rebase, e.g. "rebase onto main", "rebase my branch", "rebase on latest main", "sync my branch with main via rebase". Do not use on your own after finishing a task.
argument-hint: '[optional target branch]'
allowed-tools: Bash(git status *) Bash(git rev-parse *) Bash(git config --get *) Bash(git fetch --prune origin) Bash(git for-each-ref *) Bash(git symbolic-ref *) Bash(git log *) Bash(git show *) Bash(git diff *) Bash(git merge-base *) Bash(git rev-list *) Bash(git cherry *) Bash(glab mr list *) Bash(git rebase --abort) Bash(git rebase --skip) Bash(git -c core.editor=true rebase --continue) Bash(git checkout --ours *) Bash(git checkout --theirs *) Bash(git add *)
---

# Rebase Onto

Input: $ARGUMENTS

## Rules

- Rebase current branch only. Never `--no-verify`, `--no-gpg-sign`, `--exec`, `-i`/`--interactive`, `reset --hard`, `push --force`. Only push form allowed for rewritten history: `git push --force-with-lease=<current>:<pre-rebase sha> --force-if-includes origin HEAD:<current>`, only when `@{u}` = `origin/<current>`, after step 8 confirmation; this is the one exception to the repo never-force-push rule. Never a bare `git push --force-with-lease` (it can follow an upstream like `origin/main`).
- Rebased commits re-signed: always exactly `git rebase -S [--rebase-merges] <target>`, no other flags. It stays out of `allowed-tools` (a `git rebase -S *` pattern would also match `-i`/`--exec`), so the permission prompt is a second guard.
- During rebase, `--ours` = `HEAD` = target plus your commits already replayed, `--theirs` = user's commit being replayed (`REBASE_HEAD`).
- Push never automatic: always ask first. Push commands stay out of `allowed-tools` on purpose (second guard on history rewrite).
- Every `git rm`, `git checkout --ours/--theirs`, and abort runs only after the AskUserQuestion option that names its effect; empty-commit skip (step 6) runs without asking; `git rm` stays out of `allowed-tools`.
- Conflict analysis: ≥3 conflicted files → one `cdk:conflict-analyzer` per file, spawned in batches of ≤4 in one message; fewer → analyze inline. Agents only propose; every AskUserQuestion and git write stays here.
- Caps: Revise loop 5 rounds per file; conflict loop runs once per replayed commit (bounded by the commit count). Cap hit → tell user the rebase is still in progress (`git rebase --abort` undoes it), run step 9 once on what is left, then print the Output with `Stopped: <step>: <reason>`. Step 5 signing failure, step 7 verify failure, and step 8 push failure do the same. Steps 1–3 stops print `Resolution: not run (stopped)`; Abort rebase prints `not run (cancelled)`; step 4 prints `not run (nothing-to-do)`.
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: ask-only; sources: `Skipped:` commits, `Conflicts:` resolutions that discarded changes, `Pushed: no`).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `rebase-onto`.

## Workflow

1. **Pre-flight.** Current = `git rev-parse --abbrev-ref HEAD`; `HEAD` (detached) → stop. `git status` shows "rebase in progress" → stop, tell user to finish or `git rebase --abort`. `git status --porcelain=v1 --untracked-files=no` non-empty → stop, suggest `/cdk:commit-changes`. Signing per `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` `## Signing` (read the allowed signers file to check the key). Missing or mismatch → stop, tell user what to set.
2. **Remote branches.** `git fetch --prune origin`; fail or no `origin` → report exact error line, stop. Upstream (`git rev-parse --abbrev-ref @{u}`) exists and `git rev-list --count HEAD..@{u}` > 0 → `git cherry HEAD @{u}`: every line `-` (patch already local, earlier rebase not pushed yet) → continue; any `+` → stop, tell user remote has new commits missing locally (pull first). List `git for-each-ref --sort=-committerdate --format='%(refname:short)' refs/remotes/origin`. Drop `origin/HEAD`, `origin` and `origin/<current>`. Default = `git symbolic-ref --short refs/remotes/origin/HEAD` (unset → `origin/main` if listed). None left → stop.
3. **Target.** No ask. Input names a branch → use it if in list or `git rev-parse --verify --quiet <ref>` passes; else report, stop. No input → default (mainline, where work integrates); default not listed → stop, tell user to name a target. Report `git rev-list --left-right --count <target>...HEAD` → "<behind> behind, <ahead> ahead".
4. **Check.** Behind = 0 → report "already up to date", `Result: nothing-to-do`, stop. `git rev-list --merges <target>..HEAD` non-empty → keep merges with `--rebase-merges` (preserves history shape), no ask.
5. **Rebase.** `git rev-parse --abbrev-ref @{u}` = `origin/<current>` → pre-rebase sha = `git rev-parse @{u}` (record before rebasing; step 8 lease). `git rebase -S [--rebase-merges] <target>`. Success → step 7. Fails on signing → stop per conventions.md `## Signing`; tell user the rebase is still in progress (`git rebase --abort` undoes it); step 9, then `Stopped:`.
6. **Conflict loop.**
   - Files: `git diff --name-only --diff-filter=U`. Commit replayed: `git log -1 --format='%h %s' REBASE_HEAD`. Merge-base = `git merge-base <target> REBASE_HEAD`.
   - Analysis: ≥3 files → spawn `cdk:conflict-analyzer` per file with root, file, `REBASE_HEAD` sha, target, merge-base (≤4 per message); keep each `Conflict:`, `Hunks:`, and `Recommendation:` block; `Known issue:` lines per Rules. Fewer → inline: read conflict hunks; mine `git show REBASE_HEAD -- <file>`; ours `git log -p <merge-base>..HEAD -- <file>` (target commits plus already-replayed commits).
   - AskUserQuestion per file (≤4 per batch). Recommend per analysis (default Merge both unless one side clearly supersedes the other); give its justification:
     - Merge both — combine hunks (analyzer `combined` text or by hand); keeps both sides. Show the proposed combined hunk in the per-file question itself; choosing Merge both writes it and continues to `git add`. Revise (an option in that same question, max 5 rounds) lets the user edit the combined hunk, then re-asks; no second Accept ask.
     - Keep target — `git checkout --ours -- <file>` (`HEAD`: target plus your already-replayed commits). Whole file: discards all your changes to it from this commit.
     - Keep mine — `git checkout --theirs -- <file>`. Whole file: discards all target changes to it (may undo upstream fixes).
     - Abort rebase — `git rebase --abort`, stop, `Result: cancelled` (conflict too broad / needs author).
   - `Conflict:` `delete/modify` (inline: file deleted on one side, modified on the other) → this AskUserQuestion instead of the one above, recommend per analysis: Delete file (`git rm -- <file>`; drops the other side's changes) | Keep file (`git add -- <file>`; keeps the modified version, undoes the deletion) | Abort rebase (`git rebase --abort`).
   - Resolved file: no `<<<<<<<`/`>>>>>>>` markers left, then `git add -- <file>`.
   - `git diff --cached --quiet` exit 0 (commit now empty; change already in target) → `git rebase --skip` without asking; list it under Skipped.
   - Else `git -c core.editor=true rebase --continue`. New conflicts → repeat step 6.
7. **Verify.** `git status` clean, no rebase in progress. `git log --format='%h %G? %s' <target>..HEAD`: every `%G?` = `G`. Fail → report, step 9, then `Stopped:`.
8. **Push.** `glab mr list --source-branch <current> -F json` returns an open MR (glab missing or error → skip check) → warn that push rewrites the MR history and may mark review comments outdated. Upstream = `origin/<current>` → AskUserQuestion: Push with lease (Recommended, remote still has pre-rebase history) | Skip. Push with lease → `git push --force-with-lease=<current>:<pre-rebase sha> --force-if-includes origin HEAD:<current>`. Upstream is another branch (e.g. `origin/main`) → never force; AskUserQuestion: Skip (Recommended, upstream `<u>` is not this branch) | Push -u to `origin/<current>` (no force; rejected if it holds other history); Push -u → `git push -u origin HEAD:<current>`. No upstream → ask: Push -u (Recommended) | Skip; Push -u → `git push -u origin HEAD:<current>`. Fail → report exact error line, step 9, then `Stopped:`.
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
