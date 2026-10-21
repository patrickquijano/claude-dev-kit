---
name: review-local-changes
description: Reviews unpushed commits and uncommitted changes before a PR exists, fixes safe findings, and asks about the rest. Use only when the user explicitly asks to review their local changes.
argument-hint: '[--uncommitted] [--yes]'
allowed-tools: Bash(git rev-parse *) Bash(git status *) Bash(git symbolic-ref *) Bash(git merge-base *) Bash(git log *) Bash(git diff *) Bash(git show *) Bash(git ls-files *) Bash(git commit-tree *) Bash(GIT_INDEX_FILE=* git read-tree *) Bash(GIT_INDEX_FILE=* git add -A) Bash(GIT_INDEX_FILE=* git write-tree) Bash(mktemp -d)
---

# Review Local Changes

Input: $ARGUMENTS

## Context

- Root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`
- Branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent subagents in one parallel turn.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Only this skill asks the user (AskUserQuestion); subagents cannot. If AskUserQuestion or Write is unavailable, ask the pending question as plain text with its options, end the turn, and take the next message as the answer.
- Never commit, push, stash, reset, or touch the user's index or refs: the snapshot uses a temporary index and leaves a dangling commit (`${CLAUDE_SKILL_DIR}/references/snapshot.md`).
- Review contract, severity, validation, and direct review: `${CLAUDE_SKILL_DIR}/references/findings.md`. A small, low-risk change is reviewed here with no reviewer subagents; otherwise spawn the four reviewers in one message.
- Local checks run by default: the working tree is the code under review (reviewer path: pass no `checks:` to role `tests`; direct review: the `cdk:change-verifier` run).
- `--yes` is unattended: ask nothing in step 7 and report each open item with its recommended fix.
- Caps: reviewer respawn on a malformed return 1; fix attempts per item 2; implementer spawns <=4 per message; verifier spawns 1 per implementer batch; one ask pass over the open items. Cap hit: list what is left under `Resolution:` and finish.

## Workflow

1. **Pre-flight.** Root `<none>` → `Stopped: 1: not a git repository`. Unborn `HEAD` → `Stopped: 1: no commits to compare`. Mid-merge, rebase, cherry-pick, revert, or bisect → stop (`snapshot.md`).
2. **Base.** Default `merge-base(origin/<default>, HEAD)`; `--uncommitted` → `HEAD`. Detail: `snapshot.md`.
3. **Snapshot.** Build the dangling snapshot commit of the working tree with a temporary index. Empty range → `Result: nothing-to-do`.
4. **Gather.** Write `diff.patch` (`diff-range`), `name-status.txt` (`name-status`), and `log.txt` (`range-log`) to the scratch dir with Write.
5. **Review.** Direct-review criteria met (sizes from `diff-numstat`) → review here, marked `direct`. Else spawn `cdk:cr-reviewer` once per role (`correctness`, `security`, `tests`, `maintainability`) in one message, with `model: opus` on `correctness` and `security` (inputs in `findings.md` `## Reviewer input`).
6. **Consolidate.** Validate and deduplicate per `findings.md` `## Parent validation`; re-read each finding's `file` and `line` in the working tree and drop one the code does not support.
7. **Resolve findings.** Fix safe findings in the working tree, ask about the rest. Detail: `${CLAUDE_SKILL_DIR}/references/flow.md`.
8. **Report.** Print the findings table (id, severity, `path:line`, label, one line, recommended fix), the check results, and the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the unsafe-state check, base choice, and snapshot (steps 1-3), see `${CLAUDE_SKILL_DIR}/references/snapshot.md`.
- For the reviewer block, severity, evidence rules, validation, direct review, and reviewer input (steps 5-6), see `${CLAUDE_SKILL_DIR}/references/findings.md`.
- For the fix and ask loop (step 7), see `${CLAUDE_SKILL_DIR}/references/flow.md`.

## Output

```text
Range: <base short>..<snapshot short> (<n> files, +<a> -<d>; <committed | uncommitted | both>)
Reviewers:
- <role>: <status>[ direct] — <n critical>, <n high>, <n medium>, <n low>
Checks: `<command>` → exit <n> | skipped (<reason>), … | none  (the post-fix verifier result replaces the review-time one)
Findings: <b> blocking, <s> suggestions, <d> dropped | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Next: /cdk:prepare-change-request | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
