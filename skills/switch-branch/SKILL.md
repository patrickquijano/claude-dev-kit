---
name: switch-branch
description: Unstage staged files, derive a Conventional Branch name from uncommitted changes and optional input, switch to that new branch, and push it. Use only when the user explicitly asks to create/switch to a branch for their changes, e.g. "branch these changes", "switch to a new branch and push", "move my changes to a new branch", "put this on a feature branch". Do not use on your own after finishing a task.
argument-hint: '[optional branch hint or description]'
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git rev-parse *) Bash(git restore --staged *) Bash(git show-ref *) Bash(git ls-remote *) Bash(git switch -c *) Bash(git push -u origin *)
---

# Switch Branch

Input: $ARGUMENTS

## Rules

- Name: `<type>/<short-description>`. Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- Whole name (incl. `<type>/`) max 72 chars. Imperative verb first in description ("add-", not "added-"). Lowercase, hyphen-separated, `[a-z0-9-]` only.
- Always new branch; uncommitted changes carry over untouched. Never commit, stash, reset, or `--force`.
- Issue → check `## Known issues` first. New fix → append `- <symptom> → <fix>` to source SKILL.md (repo path, not plugin cache); not writable → print line for user.

## Workflow

1. Staged files (`git diff --cached --name-only` non-empty) → `git restore --staged :/`. Fails (no HEAD, unborn branch) → report, stop.
2. Current = `git rev-parse --abbrev-ref HEAD`; `HEAD` (detached) → `detached@<git rev-parse --short HEAD>`. Collect: `git status --porcelain=v1 -uall`, `git diff --stat`. Read diffs and new files enough to know purpose. No changes and no input → report "nothing to branch", stop.
3. Input present → analyze intent; input wins over changes on type/description conflict.
4. Draft name from steps 2–3: dominant change type + imperative summary. Exists (`git show-ref --verify --quiet refs/heads/<name>` exit 0, or `git ls-remote --heads origin refs/heads/<name>` non-empty) → append `-2`, `-3`, …. `ls-remote` error → treat as not on remote; push step reports real failure.
5. Show `Branch: <current> → <name>` + one-line reason. AskUserQuestion: Use (Recommended) | Revise. Revise → take user name or redraft, re-check rules + existence (step 4), back to step 5.
6. `git switch -c <name>`.
7. `git push -u origin <name>`. Fail → report exact error line, stop.

## Output

```text
Branch: <name> → origin/<name>
Switched from: <previous branch>
Unstaged: <files or none>
Changes carried: <count> files
```

## Known issues

- none
