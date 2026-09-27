---
name: commit-changes
description: Group uncommitted changes into atomic, signed Conventional Commits, switch off default/protected branches, and push. Use only when the user explicitly asks to commit their changes, e.g. "commit and push", "commit my changes", "split this into atomic commits". Do not use on your own after finishing a task.
argument-hint: '[optional grouping hints]'
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git config --get *) Bash(git rev-parse *) Bash(git symbolic-ref *) Bash(git remote get-url *) Bash(git restore --staged *) Bash(git add *) Bash(git commit -S -m *) Bash(git apply --cached *) Bash(git switch -c *) Bash(glab api --paginate projects/:id/protected_branches) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected)
---

# Commit Changes

Input: $ARGUMENTS

## Rules

- Subject: `<type>(<optional scope>): <subject>`. Max 72 chars. Imperative ("add", not "added"). Lowercase subject, no trailing period.
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert. Repo has commitlint config → it is source of truth.
- Subject line only: no body, no footer, no attribution (`Co-Authored-By`, "Generated with").
- Signed: always `-S`. Never `--no-gpg-sign`, `--no-verify`, `--force`; never amend existing commits.
- Atomic: one logical change per commit. Group related files; config goes with the files it configures. Rename (`D` old + `??` new) stays in one commit.
- Secrets never committed: check file names (`.env`, keys) and diff content (`-----BEGIN`, `AKIA`, `ghp_`, `glpat-`, `xox[bp]-`). Match → leave unstaged, list under Excluded, warn user.
- Issue → check `## Known issues` first. Fix for a recurring or workflow-blocking issue → append `- <symptom> → <fix>` to source SKILL.md (repo path, not plugin cache); not writable → print line for user.

## Workflow

1. Pre-flight signing: `git config --get gpg.format`, `git config --get user.signingkey`; `gpg.format=ssh` → also `git config --get gpg.ssh.allowedSignersFile`. Missing → stop, tell user what to set.
2. Staged files (`git diff --cached --name-only` non-empty) → `git restore --staged :/`.
3. Collect changes: `git status --porcelain=v1 -uall`, `git diff --stat`. Read diffs and new files enough to know each purpose. Nothing → report "nothing to commit", stop.
4. Branch guard (decide only; switch in step 7). Current = `git rev-parse --abbrev-ref HEAD`; `HEAD` (detached) → stop, report. Default = `git symbolic-ref --short refs/remotes/origin/HEAD` minus `origin/` (unset → `main`). Protected check by host in `git remote get-url origin`; run commands verbatim:
   - gitlab → `glab api --paginate projects/:id/protected_branches`; match `.[].name`, names may be globs (`release/*`).
   - github → `gh api repos/{owner}/{repo}/branches/{branch} --jq .protected` = `true`.
   - CLI missing, any API error (401/403/404), or other host → protected = `main`, `master`, `develop`, `release/*`.
   - Current = default or protected → target = new `<type>/<short-description>` from changes (lowercase, hyphens, ≤72 chars; exists → append `-2`). No prompt.
5. Group changes into commits; draft one subject per group. Order groups so earlier commits never depend on later ones (tooling/config first). Honor input hints. One file mixes unrelated changes → stage hunks via `git diff <file>` to edited patch, then `git apply --cached <patch>`; else flag in plan. Commitlint config exists → check each subject: `printf '%s\n' '<subject>' | npx commitlint`.
6. Show plan: `Branch: <current> → <target>` (if switching), then per group subject + files. AskUserQuestion: Commit all (Recommended) | Revise. Revise → back to step 5.
7. Switching → `git switch -c <target>`. Per group: `git add -- <files>`, then `git commit -S -m '<subject>'` (single quotes; backticks and `$` stay literal). Hook fails → diagnose root cause, fix, re-stage, commit again.
8. Verify: `git log --format='%h %G? %s' -n <count>`. Every `%G?` must be `G`; every subject ≤72 chars. `git status` shows only excluded files. Fail → stop, report.
9. Push: upstream exists (`git rev-parse --abbrev-ref @{u}`) → `git push`; else `git push -u origin <branch>`. Fail → report exact error line, stop.

## Output

```text
Branch: <branch> → <remote>/<branch>
Switched from: <protected/default branch or none>
Commits:
- <hash> <subject> [signature: G]
Excluded: <files or none>
```

## Known issues

- none
