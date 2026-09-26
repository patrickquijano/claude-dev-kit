---
name: rebase-onto
description: Fetch remote branches, ask which one to rebase the current branch onto, rebase with signed commits, and resolve each conflict with the user. Use only when the user explicitly asks to rebase, e.g. "rebase onto main", "rebase my branch", "rebase on latest main", "sync my branch with main via rebase". Do not use on your own after finishing a task.
argument-hint: '[optional target branch]'
allowed-tools: Bash(git status *) Bash(git rev-parse *) Bash(git config --get *) Bash(git fetch --prune origin) Bash(git for-each-ref *) Bash(git symbolic-ref *) Bash(git log *) Bash(git show *) Bash(git diff *) Bash(git merge-base *) Bash(git rev-list *) Bash(git rebase -S *) Bash(git rebase --abort) Bash(git rebase --skip) Bash(git -c core.editor=true rebase --continue) Bash(git checkout --ours *) Bash(git checkout --theirs *) Bash(git add *) Bash(git rm *)
---

# Rebase Onto

Input: $ARGUMENTS

## Rules

- Rebase current branch only. Never `--no-verify`, `--no-gpg-sign`, `--exec`, `-i`, `reset --hard`, `push --force` (only `--force-with-lease --force-if-includes`).
- Rebased commits re-signed: always `git rebase -S`.
- During rebase, `--ours` = target branch, `--theirs` = user's commit being replayed.
- Push never automatic: always ask first. Push commands stay out of `allowed-tools` on purpose (second guard on history rewrite).
- Issue → check `## Known issues` first. New fix → append `- <symptom> → <fix>` to source SKILL.md (repo path, not plugin cache); not writable → print line for user.

## Workflow

1. Pre-flight. Current = `git rev-parse --abbrev-ref HEAD`; `HEAD` (detached) → stop. `git status` shows "rebase in progress" → stop, tell user to finish or `git rebase --abort`. `git status --porcelain=v1 --untracked-files=no` non-empty → stop, suggest `/cdk:commit-changes`. Signing: `git config --get gpg.format`, `git config --get user.signingkey`; `gpg.format=ssh` → also `git config --get gpg.ssh.allowedSignersFile`. Missing → stop, tell user what to set.
2. Remote branches: `git fetch --prune origin`; fail or no `origin` → report exact error line, stop. Upstream (`git rev-parse --abbrev-ref @{u}`) exists and `git rev-list --count HEAD..@{u}` > 0 → stop, tell user remote has commits missing locally (pull first). List `git for-each-ref --sort=-committerdate --format='%(refname:short)' refs/remotes/origin`. Drop `origin/HEAD`, `origin` and `origin/<current>`. Default = `git symbolic-ref --short refs/remotes/origin/HEAD` (unset → `origin/main` if listed). None left → stop.
3. Target. Input names branch in list → use it, skip ask. Else AskUserQuestion: default first "(Recommended)" (mainline, where work integrates), then next most recently updated, max 4. Per option description: `git rev-list --left-right --count <target>...HEAD` → "<behind> behind, <ahead> ahead". Other → validate `git rev-parse --verify --quiet <ref>`; invalid → re-ask.
4. Behind = 0 → report "already up to date", stop. `git rev-list --merges <target>..HEAD` non-empty → AskUserQuestion: Keep merges `--rebase-merges` (Recommended, preserves history shape) | Flatten.
5. `git rebase -S [--rebase-merges] <target>`. Success → step 7.
6. Conflict loop:
   - Files: `git diff --name-only --diff-filter=U`. Commit replayed: `git log -1 --format='%h %s' REBASE_HEAD`.
   - Per file read conflict hunks + intent: mine `git show REBASE_HEAD -- <file>`; target `git log -p $(git merge-base <target> REBASE_HEAD)..<target> -- <file>`.
   - AskUserQuestion per file (≤4 per batch). Recommend Merge both unless one side clearly supersedes other; give justification from hunk analysis:
     - Merge both — combine hunks by hand; keeps both sides.
     - Keep target — `git checkout --ours -- <file>`. Whole file: discards all your changes to it from this commit.
     - Keep mine — `git checkout --theirs -- <file>`. Whole file: discards all target changes to it (may undo upstream fixes).
     - Abort rebase — `git rebase --abort`, stop (conflict too broad / needs author).
   - Delete/modify conflict: keep deletion → `git rm -- <file>`; keep file → `git add -- <file>`.
   - Resolved file: no `<<<<<<<`/`>>>>>>>` markers left, then `git add -- <file>`.
   - `git diff --cached --quiet` exit 0 (commit now empty) → AskUserQuestion: Skip commit (Recommended, change already in target) | Abort; skip → `git rebase --skip`.
   - Else `git -c core.editor=true rebase --continue`. New conflicts → repeat step 6.
7. Verify: `git status` clean, no rebase in progress. `git log --format='%h %G? %s' <target>..HEAD`: every `%G?` = `G`. Fail → report, stop.
8. Push. Upstream exists → AskUserQuestion: Push with lease (Recommended, remote still has pre-rebase history) | Skip. Yes → `git push --force-with-lease --force-if-includes`. No upstream → ask: Push -u (Recommended) | Skip; yes → `git push -u origin <current>`. Fail → report exact error line, stop.

## Output

```text
Rebased: <current> onto <target>
Commits replayed: <count> [signature: G]
Conflicts: <file — resolution> or none
Skipped: <commits or none>
Pushed: <remote>/<current> (force-with-lease) | no
```

## Known issues

- `rebase --continue` hangs (`GIT_EDITOR` set, overrides `core.editor`) → run `GIT_EDITOR=true git rebase --continue`.
