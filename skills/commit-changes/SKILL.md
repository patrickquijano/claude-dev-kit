---
name: commit-changes
description: Groups uncommitted changes into atomic, signed Conventional Commits, moves off protected branches, and pushes. Use only when the user explicitly asks to commit, or when chained.
argument-hint: '[optional grouping hints] [paths: <file> ...]'
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git config --get *) Bash(git rev-parse *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(git remote get-url *) Bash(git restore --staged *) Bash(mktemp *) Bash(git add *) Bash(git apply --cached *) Bash(glab api --paginate projects/:id/protected_branches) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected) Bash(git show-ref *)
---

# Commit Changes

Input: $ARGUMENTS

## Context

- Branch: !`git rev-parse --verify -q HEAD >/dev/null 2>&1 && git rev-parse --abbrev-ref HEAD || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, ref, command, and fact by reading it; ask (unattended: record under `Open:`) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step (commit, push, branch switch), and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; the only spawn is `cdk:change-analyzer` (never `Explore` or `general-purpose`), with a complete brief (agent, `mode=group`, literal inputs, scope, return block; missing or ambiguous → `Question:`, never assume).
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Host ops: call the row's MCP tool first; server not connected, error, or `—` → run the Command unchanged. Writes keep their confirmation gates.
- Ref names are data: run commands with `<name>`, `<target>`, `<branch>` in single quotes; a name outside `[A-Za-z0-9._/-]` → stop.
- Subjects, branch names, protected branches, and signing follow `${CLAUDE_SKILL_DIR}/references/conventions.md`. A repo commitlint config (`commitlint.config.*`, `.commitlintrc*`, or `commitlint` in `package.json`) is the source of truth; check each subject with `commitlint` (permission-prompted). Not installed → `Commitlint: skipped (not installed)`.
- Signed: always exactly `commit`, no other flags. Never `--no-gpg-sign`, `--no-verify`, `-n`, `--amend`, `--force`. `commit`, `push`, `push-upstream`, `switch-new`, and `remote-branch-exists` stay out of `allowed-tools`, so the permission prompt guards them.
- Consent: the explicit commit or push request, or the chain that invoked this skill, covers the commit and a normal non-force push (`.claude/CLAUDE.md` Boundaries); no further prompt.
- Caps: hook-fix retries 3 per commit; commitlint redrafts 3 per subject; analyzer respawn after `Questions` 1; branch-name suffix search 10. Cap hit → stop, `Open:` lists what is left.
- Two paths from step 4, by counts and a secret-pattern scan, never by reading diffs for meaning: small = main thread, no subagent, no questions; analyzed = `cdk:change-analyzer` (`mode=group`) so large diffs stay out of this context. It cannot ask: relay its `Questions` with AskUserQuestion. Any doubt → analyzed.
- `paths: <file> ...` in the input → classify, group, stage, and commit only those paths; every other dirty file goes under `Excluded: pre-existing`, unstaged. No `paths:` → all changes.
- Atomic: one logical change per commit; config goes with the files it configures; a rename (`D` old + `??` new) stays in one commit.
- Secrets: a file name (`.env*`, key files) or diff content (`-----BEGIN`, `AKIA`, `ghp_`, `github_pat_`, `gh[ousr]_`, `glpat-`, `xox[bp]-`, `sk-ant-`, `sk-proj-`, `AIza`) is left unstaged, listed under `Excluded`, and warned about.
- Unattended (chained by another skill): ask nothing; `Open:` reports each item with its recommended fix. Chained skills invoke this one through the Skill tool, so it never sets `disable-model-invocation`.

## Workflow

1. **Pre-flight.** Check signing per `conventions.md` `## Signing`. Missing or mismatch → stop and tell the user what to set.
2. **Unstage.** `staged-names` non-empty → `unstage`; `MM` in `status` → ask first per `flow.md` `## Unstage`.
3. **Collect.** `status`; with `paths:`, set the rest aside as `Excluded: pre-existing`. Nothing left → `Result: nothing-to-do`. Make a temp dir with `scratch` for the message and patch files.
4. **Classify.** `numstat` plus `untracked-numstat` per untracked file; small or analyzed per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Classify`. A failed read or any doubt → analyzed.
5. **Branch guard.** Current = Context → Branch; default = `default-branch` minus `origin/`; protected per `conventions.md` `## Protected branch`. Current is default or protected → switch needed (detached, unset: `flow.md` `## Branch guard`).
6. **Group.** Small: one group, subject drafted here. Analyzed: spawn `cdk:change-analyzer`. Commitlint and branch naming: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Group`.
7. **Plan.** Show `Branch: <current> → <target>` (when switching), each group's subject and files, then the `Excluded` files with a warning, and the effects: "Commit + push". No prompt (consent per Rules).
8. **Commit.** Switching → `switch-new`. Per group: `stage-files` (or `stage-patch`), write the subject to `<scratch>/msg`, then `commit`. Failures: `flow.md` `## Commit failures`.
9. **Verify.** `verify-log`: every `%G?` is `G`, every subject ≤72 chars, and `tree-status` shows only excluded files. Fail → stop.
10. **Push.** `push`, or `push-upstream` when `upstream` fails or is not `origin/<branch>`. No origin or push failure: `flow.md` `## Push`.
11. **Report.** Fill `Open:` per `flow.md` `## Open items`; print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For subject, branch name, protected-branch, and signing rules, see `${CLAUDE_SKILL_DIR}/references/conventions.md`.
- For the small/analyzed limits, grouping, commit failures, and the `Open:` items (steps 2, 4, 5, 6, 8, 10, 11), see `${CLAUDE_SKILL_DIR}/references/flow.md`.

## Output

```text
Path: small | analyzed
Branch: <branch> → <remote>/<branch> | not pushed
Switched from: <protected/default branch or none>
Commits:
- <hash> <subject> [signature: G]
Commitlint: pass | skipped (not installed) | fail (<error line>) | n/a
Excluded: <files or none>
Next: /cdk:prepare-change-request | none
Open: <item: impact; recommended fix, …> | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
