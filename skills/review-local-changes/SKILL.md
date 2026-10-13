---
name: review-local-changes
description: Review the user's unpushed commits and uncommitted changes before they are committed or a PR exists, with parallel read-only reviewers (or directly for a small change), then fix the safe findings and ask about the rest. Use only when the user explicitly asks to review their local changes, e.g. "review my changes", "review before I commit". Do not use on your own after finishing a task.
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

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- User interaction (AskUserQuestion) only here; subagents cannot ask.
- Never commit, push, stash, reset, or touch the user's index or refs: the snapshot uses a temporary index and leaves a dangling commit (`${CLAUDE_SKILL_DIR}/references/snapshot.md`).
- Review contract, `## Direct review`, severity, and `## Parent validation` steps 1–3: `${CLAUDE_SKILL_DIR}/../prepare-change-request/references/findings.md`; there is no gate step. A small, low-risk change is reviewed here with no subagents; otherwise spawn the four reviewers (`cdk:cr-correctness-reviewer`, `cdk:cr-security-reviewer`, `cdk:cr-test-reviewer`, `cdk:cr-maintainability-reviewer`) in one message, each given root, base, merge-base, the snapshot SHA as head, the scratch file paths, and the findings contract path (`findings.md` above).
- Local checks run by default: the working tree is the code under review (pass no `checks:` to `cdk:cr-test-reviewer`).
- Caps: reviewer respawn on a malformed return 1; fix attempts per item 2 (resolve-findings.md).
- `--yes` counts as unattended for step 7: ask nothing and report each item's recommended fix.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../shared/references/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../shared/references/resolve-findings.md` (scope: edit; sources: kept findings, incomplete reviewers, `Checks:` failed or skipped).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../shared/references/known-issues.md` with slug `review-local-changes` and store `${CLAUDE_PLUGIN_DATA}/known-issues`; it covers reviewer `Known issue:` lines.

## Workflow

1. **Pre-flight.** Root `<none>` → `Result: stopped`, `Stopped: 1: not a git repository`. No commits yet (unborn `HEAD`) → `Stopped: 1: no commits to compare`. Mid-merge, rebase, cherry-pick, revert, or bisect → stop (`unsafe-state` per snapshot.md).
2. **Base.** Default `merge-base(origin/<default>, HEAD)..snapshot`; `--uncommitted` → `HEAD..snapshot`. Detail: `${CLAUDE_SKILL_DIR}/references/snapshot.md`.
3. **Snapshot.** Build the dangling snapshot commit of the working tree with a temporary index; the range is `<base>..<snapshot>`. Range empty → `Result: nothing-to-do`.
4. **Gather.** Write `diff.patch` (`diff-range`), `name-status.txt` (`name-status`), and `log.txt` (`range-log`) under the scratch dir with the Write tool; reviewers read commits from `log.txt` and the diff from base and snapshot SHA (the snapshot's own commit is synthetic). Edit and Write use the normal permission prompt.
5. **Review.** Direct-review criteria (sizes from `diff-numstat`) met → review here per findings.md `## Direct review`, else the four parallel reviewers; mark them `direct` or not.
6. **Consolidate.** findings.md `## Parent validation` steps 1–3; re-read each finding's `file` and `line` in the working tree and drop one the code does not support.
7. **Resolve findings.** Per resolve-findings.md: fix safe in-scope findings in the working tree, ask about the rest; edited files stay uncommitted.
8. **Report.** Print the findings table (id, severity, `path:line`, label, one line, recommended fix), the check results, and the Output.

## Output

```text
Range: <base short>..<snapshot short> (<n> files, +<a> -<d>; <committed | uncommitted | both>)
Reviewers:
- <role>: <status>[ direct] — <n critical>, <n high>, <n medium>, <n low>
Checks: `<command>` → exit <n> | skipped (<reason>), … | none
Findings: <b> blocking, <s> suggestions, <d> dropped | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
