---
name: debug-issue
description: Finds a bug's root cause from an error, stack trace, or failing test, proves it with a regression test, and fixes it after confirmation. Use only when the user explicitly asks to debug an issue.
argument-hint: '[--yes] <error | stack trace | failing test | behavior>'
allowed-tools: Bash(git rev-parse *) Bash(git status *) Bash(git log *) Bash(git diff *) Bash(git show *) Bash(git blame *)
---

# Debug Issue

Input: $ARGUMENTS (strip `--yes`; the rest is the error or symptom text)

## Context

- Root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`
- Branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '<none>'`
- Status: !`git status --porcelain=v1 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Root cause first: no fix and no test edit until the cause is shown with `file:line` evidence. A guess is labeled a hypothesis. Temporary probes (logs, prints) are allowed during step 4, tracked, and reverted before step 6.
- Test, lint, type check, and build commands come from the project's documented commands (CLAUDE.md `Commands`), not from `commands.md`.
- The regression test must fail for the reported reason before the fix and pass after; never weaken, skip, or delete an existing test.
- Caps: reproduce max 3 tries; fix max 3 attempts; step 10 max 3 rounds; one `cdk:topic-researcher` spawn. Cap hit at step 8 → run step 10 on what is left, then print the Output with `Stopped: <step>: <reason>` and end.
- Never commit, push, stash, or `reset --hard`; a bisect always ends with `bisect-reset`.
- Regression test: match the project's runner, location, and naming; Arrange, Act, Assert blocks; inputs from the stack's faker library when the project has one; a unit test unless only an integration test can reproduce the bug. For a broader test suite, the user can run `cdk:add-unit-tests` afterwards.
- `--yes` picks the recommended option of step 7 and of the bisect ask and counts as unattended for step 10.
- AskUserQuestion unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer.
- Step 10 fix loop: at most 3 rounds; it fixes only what this run changed (failed or skipped checks, a regression test that did not fail first). Unattended runs ask nothing. Whatever is left goes to `Open:` before `Result:`.

## Workflow

1. **Pre-flight.** Root `<none>` → `Result: stopped`, `Stopped: 1: not a git repository`. Note the dirty paths from Status; neither the test (step 6) nor the fix (step 8) touches a dirty path without asking.
2. **Evidence.** Pull the error, stack trace, failing test, expected versus actual, and repro steps from the input. No way to reproduce → ask once with AskUserQuestion (`I will add details` | `Cancel`); none given → `Result: cancelled`.
3. **Reproduce.** Run the failing test or steps, up to 3 tries. Not reproducible → say so and continue with static evidence, marked `unreproduced`.
4. **Isolate.** Rank hypotheses, test the cheapest first, and record each as confirmed or ruled out. Bisect and research: `${CLAUDE_SKILL_DIR}/references/isolate.md`.
5. **Root cause.** Report the cause with `file:line` evidence, why it produces the symptom, and the smallest fix.
6. **Regression test.** Draft the test, write it, and run it; it must fail for the reported reason. Fails for another reason → fix the test; a failure that cannot be made to match → `Regression test: none` and say why.
7. **Confirm.** One AskUserQuestion: `Apply fix (Recommended)` | `Diagnose only` | `Cancel`. `Diagnose only` → keep the test, list its path, step 10; `Cancel` → remove the test file this run wrote, `Result: cancelled`.
8. **Fix.** Apply the minimal change that the root cause calls for, nothing adjacent; up to 3 attempts, each re-run against the regression test.
9. **Verify.** The new test passes, then the documented lint, type check, test, and build commands for the changed files (CLAUDE.md `Commands`); record each as pass, fail, or skipped with the reason.
10. **Fix leftovers.** Failed or skipped checks, open hypotheses, or a test that did not fail first: fix what this run changed, re-run, up to the cap; list the rest in `Open:`.

## Files

- For the hypothesis loop, bisect, and research (step 4), see `${CLAUDE_SKILL_DIR}/references/isolate.md`.
- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.

## Output

```text
Symptom: <one line>
Root cause: <file:line — one line> | not found
Evidence: <file:line — what it shows>, …
Hypotheses: <n> confirmed, <m> ruled out, <k> open
Regression test: <path — fails before, passes after | fails before, fix not applied> | none (<reason>)
Fix: applied (<files>) | not applied (diagnose only) | not applied (<reason>)
Verify: <command> pass | fail | skipped (<reason>), … | not run
Next: /cdk:commit-changes | none
Open: <id: severity, reason; recommended fix>, … | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
