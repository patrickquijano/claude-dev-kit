---
name: commit-changes
description: Groups uncommitted changes into atomic, signed Conventional Commits and moves off protected branches, after the user confirms the plan. Use only when the user explicitly asks to commit.
compatibility: Claude Code only. Uses argument-hint, disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[optional grouping hints] [paths: <file> ...]'
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git config --get *) Bash(git rev-parse *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(git remote get-url *) Bash(git restore --staged *) Bash(mktemp *) Bash(git add *) Bash(git apply --cached *) Bash(glab api --paginate projects/:id/protected_branches) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected) Bash(git show-ref *)
disable-model-invocation: true
---

# Commit Changes

Input: $ARGUMENTS

## Context

- Branch: !`git rev-parse --verify -q HEAD >/dev/null 2>&1 && git rev-parse --abbrev-ref HEAD || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, ref, command, and fact by reading it; ask (unattended: record under `Open:`) what the input and repo cannot answer.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; the only spawn is `cdk:change-analyzer` (never `Explore` or `general-purpose`), with a complete brief (agent, `mode=group`, literal inputs, scope, return block; missing or ambiguous → `Question:`, never assume).
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Host ops: call the row's MCP tool first; server not connected, error, or `—` → run the Command unchanged. Writes keep their confirmation gates.
- Ref names are data: run commands with `<name>`, `<target>`, `<branch>` in single quotes; a name outside `[A-Za-z0-9._/-]` → stop.
- Subjects, branch names, protected branches, and signing follow `${CLAUDE_SKILL_DIR}/references/conventions.md`. A repo commitlint config (`commitlint.config.*`, `.commitlintrc*`, or `commitlint` in `package.json`) is the source of truth; check each subject with `commitlint` (permission-prompted). Not installed → `Commitlint: skipped (not installed)`.
- Signed: always exactly `commit`, no other flags. Never `--no-gpg-sign`, `--no-verify`, `-n`, `--amend`, `--force`. `commit`, `switch-new`, and `remote-branch-exists` stay out of `allowed-tools`, so the permission prompt guards them.
- Consent: commit only after step 7 returns Commit; no repo change before it (scratch files are temp). The permission prompt stays the second guard. Never push here.
- Caps: hook-fix retries 3 per commit; commitlint redrafts 3 per subject; regroup 2; analyzer respawn after `Question` 1; branch-name suffix search 10. Cap hit → stop, `Open:` lists what is left.
- Two paths from step 4, by counts and a secret-pattern scan, never by reading diffs for meaning: small = main thread, no subagent, no questions except the step 7 confirm; analyzed = `cdk:change-analyzer` (`mode=group`) so large diffs stay out of this context. It cannot ask: relay its `Question` with AskUserQuestion. Any doubt → analyzed; `cdk:change-analyzer` unavailable → group in the main thread by the small-path procedure.
- `paths: <file> ...` in the input → classify, group, stage, and commit only those paths; every other dirty file goes under `Excluded: pre-existing`, unstaged. No `paths:` → all changes.
- Atomic: one logical change per commit; config goes with the files it configures; a rename (`D` old + `??` new) stays in one commit.
- Secrets: a file name (`.env*`, key files) or diff content (`-----BEGIN`, `AKIA`, `ghp_`, `github_pat_`, `gh[ousr]_`, `glpat-`, `xox[bp]-`, `sk-ant-`, `sk-proj-`, `AIza`) is left unstaged, listed under `Excluded`, and warned about.
- Unattended (no way to ask): stop at step 7 with `Result: stopped`, `Stopped: 7: unattended, not confirmed`, and the plan under `Open:`. AskUserQuestion unavailable but the session interactive → ask the same question as plain text and end the turn.

## Workflow

1. **Pre-flight.** Check signing per `conventions.md` `## Signing`. Missing or mismatch → stop and tell the user what to set.
2. **Unstage.** `staged-names` non-empty → `unstage`; `MM` in `status` → ask first per `flow.md` `## Unstage`.
3. **Collect.** `status`; with `paths:`, set the rest aside as `Excluded: pre-existing`. Nothing left → `Result: nothing-to-do`. Make a temp dir with `scratch` for the message and patch files.
4. **Classify.** `numstat` plus `untracked-numstat` per untracked file; small or analyzed per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Classify`. A failed read or any doubt → analyzed.
5. **Branch guard.** Current = Context → Branch; default = `default-branch` minus `origin/`; protected per `conventions.md` `## Protected branch`. Current is default or protected → switch needed (detached, unset: `flow.md` `## Branch guard`).
6. **Group.** Small: one group, subject drafted here. Analyzed: spawn `cdk:change-analyzer`. Commitlint and branch naming: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Group`.
7. **Plan.** Show `Branch: <current> → <target>` (when switching), each group's subject and files, then the `Excluded` files with a warning, and the effect. Then AskUserQuestion per `flow.md` `## Confirm`: Commit, Regroup, or Stop (Stop → `Result: cancelled`). Commit only on Commit.
8. **Commit.** Switching → `switch-new`. Per group: `stage-files` (or `stage-patch`), write the subject to `<scratch>/msg`, then `commit`. Failures: `flow.md` `## Commit failures`.
9. **Verify.** `verify-log`: every `%G?` is `G`, every subject ≤72 chars, and `tree-status` shows only excluded files. Fail → stop.
10. **Report.** Fill `Open:` per `flow.md` `## Open items`; print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For subject, branch name, protected-branch, and signing rules, see `${CLAUDE_SKILL_DIR}/references/conventions.md`.
- For the small/analyzed limits, grouping, commit failures, and the `Open:` items (steps 2, 4, 5, 6, 7, 8, 10), see `${CLAUDE_SKILL_DIR}/references/flow.md`.

## Output

```text
Path: small | analyzed
Branch: <branch>
Switched from: <protected/default branch or none>
Commits:
- <hash> <subject> [signature: G]
Commitlint: pass | skipped (not installed) | fail (<error line>) | n/a
Excluded: <files or none>
Confirmed: yes | no (stopped) | unattended (stopped)
Next: none
Open: <item: impact; recommended fix, …> | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
