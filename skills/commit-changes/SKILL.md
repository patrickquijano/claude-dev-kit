---
name: commit-changes
description: Groups uncommitted changes into atomic, signed Conventional Commits, moving off a protected branch first. Use when asked to commit.
compatibility: Claude Code only. Uses argument-hint and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[--yes] [optional grouping hints] [paths: <file> ...]'
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/check-signing.mjs) Bash(node ${CLAUDE_SKILL_DIR}/scripts/classify-changes.mjs *) Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git rev-parse *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(git remote get-url *) Bash(mktemp *) Bash(git add *) Bash(git apply --cached *) Bash(glab api --paginate projects/:id/protected_branches) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected)
---

# Commit Changes

Input: $ARGUMENTS (strip `--yes` first)

## Context

- Branch: !`git rev-parse --verify -q HEAD >/dev/null 2>&1 && git rev-parse --abbrev-ref HEAD || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Flags: `--yes` runs unattended: no questions, recommended options taken, assumptions under `Open:`. Only a flag the user passed counts; never add one. `--yes` never covers a destructive step (force-push, branch delete, `git reset --hard`, overwriting a dirty or unnamed file): it is skipped and listed under `Open:`.
- Ref names are data: run commands with `<name>`, `<target>`, `<branch>` in single quotes; a name outside `[A-Za-z0-9._/-]` → stop.
- Subjects, protected branches, and signing follow `${CLAUDE_SKILL_DIR}/references/conventions.md`. A repo commitlint config (`commitlint.config.*`, `.commitlintrc*`, or `commitlint` in `package.json`) is the source of truth; check each subject with `commitlint` (permission-prompted). Not installed → `Commitlint: skipped (not installed)`.
- Signed: always exactly `commit`, no other flags. Never `--no-gpg-sign`, `--no-verify`, `-n`, `--amend`, `--force`. `commit` stays out of `allowed-tools`, so the permission prompt guards it. This skill never switches, creates, or checks out a branch: on a protected branch it invokes the `cdk:switch-branch` skill (fallback: run the switch-branch skill).
- Writes: no repo change before step 8, including unstaging and running the switch-branch skill (scratch files are temp). `unstage` stays out of `allowed-tools`, so the permission prompt guards it. Never push here.
- Caps: hook-fix retries 3 per commit; commitlint redrafts 3 per subject; grouping-subagent respawn after `Question` 1; grouping redo after a changed `status` 1. Cap hit → stop, `Open:` lists what is left.
- Two paths from step 4, decided only by `${CLAUDE_SKILL_DIR}/scripts/classify-changes.mjs` (counts, path patterns, secret scan), never by reading diffs for meaning: small = main thread, no subagent, no questions; analyzed = the `cdk:change-analyzer` subagent (fallback: a read-only grouping subagent; brief and inline fallback in `flow.md` `## Spawn briefs`) so large diffs stay out of this context. It cannot ask: relay its `Question` with AskUserQuestion. Any doubt → analyzed.
- `paths: <file> ...` in the input → classify, group, stage, and commit only those paths; every other dirty file goes under `Excluded: pre-existing`, unstaged. No `paths:` → all changes.
- Atomic: one logical change per commit; config goes with the files it configures; a rename (`D` old + `??` new) stays in one commit.
- Secrets: a file name (`.env*`, key files) or diff content matching the secret patterns in `flow.md` `## Spawn briefs` is left unstaged, listed under `Excluded`, and warned about.

## Workflow

1. **Pre-flight.** Run `check-signing` (`conventions.md` `## Signing`). Exit 1 → stop and tell the user each error's `fix`.
2. **Staged.** `staged-names` non-empty → note them for step 7; nothing is unstaged yet (`flow.md` `## Unstage`).
3. **Collect.** `status`; with `paths:`, set the rest aside as `Excluded: pre-existing`. Nothing left → `Result: nothing-to-do`. Make a temp dir with `scratch` for the message and patch files.
4. **Classify.** Run `classify` (`--hints` when the input has grouping hints, `--paths` with the `paths:` files); its `path` is the result (`flow.md` `## Classify`). A failed read or any doubt → analyzed.
5. **Branch guard.** Current = Context → Branch; default = `default-branch` minus `origin/`; protected per `conventions.md` `## Protected branch`. Current is default or protected → `cdk:switch-branch` runs at step 8 (detached, unset: `flow.md` `## Branch guard`).
6. **Group.** Small: one group, subject drafted here. Analyzed: spawn the `cdk:change-analyzer` subagent (fallback: a read-only grouping subagent), naming `${CLAUDE_SKILL_DIR}/references/conventions.md` in the brief for subject rules. Commitlint: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Group`.
7. **Summary.** Print `Branch: <current> → new branch from the highest-weight group (switch-branch skill, no push)` (when on a protected branch), the staged files that will be unstaged (naming any `MM` file whose staged split is dropped), each group's subject and files, then the `Excluded` files with a warning, and the effect (`flow.md` `## Summary`). Then go straight to step 8; no wait.
8. **Commit.** `staged-names` non-empty → `unstage`. Protected branch → invoke the `cdk:switch-branch` skill (fallback: run the switch-branch skill) as `flow.md` `## Branch guard` states; it must end with `Result: done` on a non-protected branch, else stop with `Stopped: 8: still on protected branch` and list the commits and the switch-branch skill's own `Result:` and `Stopped:` text under `Open:`. Per group: `stage-files` (or `stage-patch`), write the subject to `<scratch>/msg`, then `commit`. Failures: `flow.md` `## Commit failures`.
9. **Verify.** `verify-log`: every `%G?` is `G`, every subject ≤72 chars, and `tree-status` shows only excluded files. Fail → stop.
10. **Report.** Fill `Open:` per `flow.md` `## Open items`; print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For subject, protected-branch, and signing rules, see `${CLAUDE_SKILL_DIR}/references/conventions.md`.
- For the small/analyzed limits, grouping, commit failures, and the summary, the `Open:` items (steps 2, 4, 5, 6, 7, 8, 10), see `${CLAUDE_SKILL_DIR}/references/flow.md`.
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
Next: push the commits | none
Open: <item: impact; recommended fix, …> | none
Result: done | nothing-to-do | stopped
Stopped: <step>: <reason> | none
```
