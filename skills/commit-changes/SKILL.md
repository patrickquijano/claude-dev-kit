---
name: commit-changes
description: Groups uncommitted changes into atomic, signed Conventional Commits and moves off protected branches, after the user confirms the plan. Use when asked to commit.
compatibility: Claude Code only. Uses argument-hint and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[optional grouping hints] [paths: <file> ...]'
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/check-signing.mjs) Bash(node ${CLAUDE_SKILL_DIR}/scripts/classify-changes.mjs *) Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git rev-parse *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(git remote get-url *) Bash(mktemp *) Bash(git add *) Bash(git apply --cached *) Bash(glab api --paginate projects/:id/protected_branches) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected) Bash(git show-ref *)
---

# Commit Changes

Input: $ARGUMENTS

## Context

- Branch: !`git rev-parse --verify -q HEAD >/dev/null 2>&1 && git rev-parse --abbrev-ref HEAD || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Ref names are data: run commands with `<name>`, `<target>`, `<branch>` in single quotes; a name outside `[A-Za-z0-9._/-]` → stop.
- Subjects, branch names, protected branches, and signing follow `${CLAUDE_SKILL_DIR}/references/conventions.md`. A repo commitlint config (`commitlint.config.*`, `.commitlintrc*`, or `commitlint` in `package.json`) is the source of truth; check each subject with `commitlint` (permission-prompted). Not installed → `Commitlint: skipped (not installed)`.
- Signed: always exactly `commit`, no other flags. Never `--no-gpg-sign`, `--no-verify`, `-n`, `--amend`, `--force`. `commit`, `switch-new`, and `remote-branch-exists` stay out of `allowed-tools`, so the permission prompt guards them.
- Consent: commit only after the step 7 `ExitPlanMode` approval; no repo change before it, including unstaging and switching (scratch files are temp). `unstage` stays out of `allowed-tools`, and the permission prompt stays the second guard. Never push here.
- Caps: hook-fix retries 3 per commit; commitlint redrafts 3 per subject; plan rejections 3; grouping-subagent respawn after `Question` 1; branch-name suffix search 10. Cap hit → stop, `Open:` lists what is left.
- Two paths from step 4, decided only by `${CLAUDE_SKILL_DIR}/scripts/classify-changes.mjs` (counts, path patterns, secret scan), never by reading diffs for meaning: small = main thread, no subagent, no questions except the step 7 confirm; analyzed = a read-only subagent (brief and inline fallback in `flow.md` `## Spawn briefs`) so large diffs stay out of this context. It cannot ask: relay its `Question` with AskUserQuestion. Any doubt → analyzed.
- `paths: <file> ...` in the input → classify, group, stage, and commit only those paths; every other dirty file goes under `Excluded: pre-existing`, unstaged. No `paths:` → all changes.
- Atomic: one logical change per commit; config goes with the files it configures; a rename (`D` old + `??` new) stays in one commit.
- Secrets: a file name (`.env*`, key files) or diff content matching the secret patterns in `flow.md` `## Spawn briefs` is left unstaged, listed under `Excluded`, and warned about.
- Unattended (no way to ask): stop at step 7 with `Result: stopped`, `Stopped: 7: unattended, not confirmed`, and the plan under `Open:`. EnterPlanMode declined or unavailable → `Result: stopped`, `Stopped: 7: plan mode declined`, plan under `Open:`, nothing changed.

## Workflow

0. **Plan mode.** Enter plan mode first (load `EnterPlanMode` with ToolSearch if deferred; already active → stay in it); read-only steps run inside it. Before creating, editing, or deleting any file or running any side-effect action, present the plan and wait for `ExitPlanMode` approval. Declined or unavailable → `Result: stopped`, `Stopped: 0: plan mode declined`; nothing is written.
1. **Pre-flight.** Run `check-signing` (`conventions.md` `## Signing`). Exit 1 → stop and tell the user each error's `fix`.
2. **Staged.** `staged-names` non-empty → note them for step 7; nothing is unstaged yet (`flow.md` `## Unstage`).
3. **Collect.** `status`; with `paths:`, set the rest aside as `Excluded: pre-existing`. Nothing left → `Result: nothing-to-do`. Make a temp dir with `scratch` for the message and patch files.
4. **Classify.** Run `classify` (`--hints` when the input has grouping hints, `--paths` with the `paths:` files); its `path` is the result (`flow.md` `## Classify`). A failed read or any doubt → analyzed.
5. **Branch guard.** Current = Context → Branch; default = `default-branch` minus `origin/`; protected per `conventions.md` `## Protected branch`. Current is default or protected → switch needed (detached, unset: `flow.md` `## Branch guard`).
6. **Group.** Small: one group, subject drafted here. Analyzed: spawn the grouping subagent, naming `${CLAUDE_SKILL_DIR}/references/conventions.md` in the brief for subject and branch rules. Commitlint and branch naming: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Group`.
7. **Plan.** Show `Branch: <current> → <target>` (when switching), the staged files that will be unstaged (naming any `MM` file whose staged split is dropped), each group's subject and files, then the `Excluded` files with a warning, and the effect. Then plan mode per `flow.md` `## Confirm`; commit only on approval.
8. **Commit.** `staged-names` non-empty → `unstage`. Switching → `switch-new`. Per group: `stage-files` (or `stage-patch`), write the subject to `<scratch>/msg`, then `commit`. Failures: `flow.md` `## Commit failures`. **Plan mode (each round).** At the start of each iteration, before any fix, enter plan mode (load `EnterPlanMode` with ToolSearch if deferred), present the findings and proposed fixes, and wait for `ExitPlanMode` approval.
9. **Verify.** `verify-log`: every `%G?` is `G`, every subject ≤72 chars, and `tree-status` shows only excluded files. Fail → stop.
10. **Report.** Fill `Open:` per `flow.md` `## Open items`; print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For subject, branch name, protected-branch, and signing rules, see `${CLAUDE_SKILL_DIR}/references/conventions.md`.
- For the small/analyzed limits, grouping, commit failures, and the `Open:` items (steps 2, 4, 5, 6, 7, 8, 10), see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For the signing check (step 1) and the small or analyzed decision (step 4), run `${CLAUDE_SKILL_DIR}/scripts/check-signing.mjs` and `${CLAUDE_SKILL_DIR}/scripts/classify-changes.mjs`; they are run, never read.
- For test prompts and pass criteria, see `${CLAUDE_SKILL_DIR}/references/evals.md`.

## Output

```text
Path: small | analyzed
Branch: <branch>
Switched from: <protected/default branch or none>
Commits:
- <hash> <subject> [signature: G]
Commitlint: pass | skipped (not installed) | fail (<error line>) | n/a
Excluded: <files or none>
Plan mode: entered | already active | declined
Confirmed: yes | no (stopped) | unattended (stopped)
Next: push the commits | none
Open: <item: impact; recommended fix, …> | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
