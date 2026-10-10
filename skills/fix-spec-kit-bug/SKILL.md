---
name: fix-spec-kit-bug
description: Fix a bug with the GitHub Spec Kit bug extension from a stack trace, error or warning, URL, or bug report. Extract the evidence, then chain speckit-bug-assess, speckit-bug-fix, and speckit-bug-test, re-running fix (or assess when the assessment proves wrong) until the test verifies the fix, up to 3 passes. Use only when the user explicitly asks to fix, triage, or assess a bug with Spec Kit. Do not use on your own after finishing a task.
argument-hint: '<stack trace | error | URL | bug report>'
---

# Fix Spec Kit Bug

Input: $ARGUMENTS

## Rules

- Follow `${CLAUDE_SKILL_DIR}/../setup-spec-kit/speckit-chain.md` with prefix `speckit-bug-` and group `bug`.
- Pass `slug=<slug>` to every step after assess. All three commands share the slug and write only to `.specify/bugs/<slug>/`.
- Pre-approved exceptions to relaying questions: on pass 2 and later, answer yes to overwriting `assessment.md`, `fix.md`, and `test.md` in the current slug; in step 5, answer yes to running skipped or not-run checks.
- Passes: one pass = fix, then test; the first fix + test is pass 1. A re-assess uses up a pass (re-assess, fix, test count as one). Every step 6 entry starts a new pass, whether test runs or not. Max 3 passes.
- Test re-runs (step 5 skipped checks): max 3 per pass.
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: ask-only; sources: `Fix: partial|not-applied`, `Test: partial|failed|not run` with the failing or not-run checks from `test.md`).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `fix-spec-kit-bug`.

## Workflow

1. **Pre-flight.** Run the speckit-chain pre-flight for `bug`. Input empty → AskUserQuestion for the stack trace, error, URL, or bug report.
2. **Extract.** Read the input and pull out each kind of evidence present: stack trace, error or warning message, URL, and bug report (symptom, expected versus actual, reproduction steps). None found → AskUserQuestion for one. User gives none or cancels a question → `Result: cancelled`, `Stopped: <step>: user cancelled`, report, stop. Show the found items in a short list.
3. **Assess.** Run `speckit-bug-assess <extracted evidence>`, keeping URLs verbatim; assess fetches and merges them with the text. Take the slug from its `Slug:` line. Verdict `invalid` → `Fix: not-applied (0 pass(es), 0 re-assess)`, `Test: not run`, `Result: stopped`, `Stopped: Assess: verdict invalid`; report the output below, stop; fix refuses an invalid verdict.
4. **Fix.** Run `speckit-bug-fix slug=<slug>`. Branch on the Status in `fix.md`:
   - `applied` → step 5.
   - `not-applied` or `partial`, Deviations say the assessment is wrong → step 6 (re-assess).
   - `partial`, other reason → step 5; the test shows what the applied part fixes.
   - `not-applied`, other reason → list the blockers from `fix.md`. Collect the input with AskUserQuestion: one option per blocker (option text = how to resolve it), plus Stop, free text via Other; then step 6 (retry) with that answer as `<user input>`. Stop → `Test: not run`, `Result: stopped`; run step 7 on the `fix.md` blockers without re-entering the loop, then print the Output with `Stopped: Fix: not-applied, user stopped` and end.
5. **Test.** Run `speckit-bug-test slug=<slug>`. Read the Result in `test.md`:
   - `verified` → report, done.
   - `failed`, or `partial` with a failing check or regression → step 6 (failing checks).
   - `partial` with only `skipped` or `not-run` checks → list them, re-run test with consent to run them, no ask, then read the Result again. 3 re-runs done → `Test: partial (<k> not run)`, `Result: stopped`; run step 7 on the not-run checks without re-entering the loop, then print the Output with `Stopped: Test: <k> checks not run` and end.
6. **Iterate.** 3 passes done → `Result: stopped`, `Stopped: Iterate: 3 passes`, list the failing checks from `test.md` (or the blockers from `fix.md`), then step 7, stop; repeated misses point to a wrong root cause. Else start the next pass by entry:
   - Re-assess (from step 4, Deviations say the assessment is wrong) → run `speckit-bug-assess slug=<slug> <extracted evidence> Evidence from .specify/bugs/<slug>/test.md and fix.md`. Verdict `invalid` → `Result: stopped`; run step 7 on the failing checks from `test.md` and the blockers from `fix.md` without re-entering the loop, then print the Output with `Stopped: Iterate: re-assess verdict invalid` and end. Else step 4.
   - Retry (from step 4, user input collected) → run `speckit-bug-fix slug=<slug> <user input>`, then branch on its Status as in step 4.
   - Failing checks (from step 5, `failed` or failing `partial`) → tell the user which checks failed, run `speckit-bug-fix slug=<slug> Address the failing checks in .specify/bugs/<slug>/test.md`, then branch on its Status as in step 4.
7. **Resolve findings.** Per resolve-findings.md, once when the run ends after assess with `Fix:` or `Test:` not clean (a `verified` test skips it), including every step 4, 5, and 6 stop above, then print the Output with `Stopped:`; the step itemizes the failing or not-run checks from `test.md` and the blockers from `fix.md`, and never re-runs the fix or test passes. The step 3 verdict `invalid` stop has no items and prints `Resolution: not run (stopped)`; a step 2 cancel prints `Resolution: not run (cancelled)`.

## Output

```text
Bug: .specify/bugs/<slug>/
Verdict: <valid | likely valid, needs reproduction | invalid>; severity <level>
Fix: <applied | partial | not-applied> (<passes> pass(es), <n> re-assess)
Test: verified | partial (<k> not run) | failed (<k> checks failing) | not run
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | stopped | cancelled
Stopped: <step>: <reason> | none
```
