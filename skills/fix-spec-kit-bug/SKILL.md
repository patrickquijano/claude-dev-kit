---
name: fix-spec-kit-bug
description: Fix a bug with the GitHub Spec Kit bug extension from a stack trace, error or warning, URL, or bug report. Extract the evidence, then chain speckit-bug-assess, speckit-bug-fix, and speckit-bug-test, re-running fix (or assess when the assessment proves wrong) until the test verifies the fix, up to 3 passes. Use when the user asks to fix, triage, or assess a bug with Spec Kit.
argument-hint: '<stack trace | error | URL | bug report>'
---

# Fix Spec Kit Bug

Input: $ARGUMENTS

## Rules

- Follow `${CLAUDE_SKILL_DIR}/../setup-spec-kit/speckit-chain.md` with prefix `speckit-bug-` and group `bug`.
- Pass `slug=<slug>` to every step after assess. All three commands share the slug and write only to `.specify/bugs/<slug>/`.
- Pre-approved exception to relaying questions: on pass 2 and later, answer yes to overwriting `assessment.md`, `fix.md`, and `test.md` in the current slug.
- Passes: one pass = fix, then test; the first fix + test is pass 1. A re-assess uses up a pass (re-assess, fix, test count as one). Every step 6 entry starts a new pass, whether test runs or not. Max 3 passes.
- Test re-runs (step 5 Run them): max 3 per pass.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `fix-spec-kit-bug`.

## Workflow

1. **Pre-flight.** Run the speckit-chain pre-flight for `bug`. Input empty → AskUserQuestion for the stack trace, error, URL, or bug report.
2. **Extract.** Read the input and pull out each kind of evidence present: stack trace, error or warning message, URL, and bug report (symptom, expected versus actual, reproduction steps). None found → AskUserQuestion for one. User gives none or cancels a question → `Result: cancelled`, `Stopped: <step>: user cancelled`, report, stop. Show the found items in a short list.
3. **Assess.** Run `speckit-bug-assess <extracted evidence>`, keeping URLs verbatim; assess fetches and merges them with the text. Take the slug from its `Slug:` line. Verdict `invalid` → `Fix: not-applied (0 pass(es), 0 re-assess)`, `Test: not run`, `Result: stopped`, `Stopped: Assess: verdict invalid`; report the output below, stop; fix refuses an invalid verdict.
4. **Fix.** Run `speckit-bug-fix slug=<slug>`. Branch on the Status in `fix.md`:
   - `applied` → step 5.
   - `not-applied` or `partial`, Deviations say the assessment is wrong → step 6 (re-assess).
   - `partial`, other reason → step 5; the test shows what the applied part fixes.
   - `not-applied`, other reason → list the blockers from `fix.md`. AskUserQuestion: Retry with my input (Recommended) | Stop. Retry → collect the input with a follow-up AskUserQuestion: one option per blocker (option text = how to resolve it), free text via Other; then step 6 (retry) with that answer as `<user input>`. Stop → `Test: not run`, `Result: stopped`, `Stopped: Fix: not-applied, user stopped`, report, stop.
5. **Test.** Run `speckit-bug-test slug=<slug>`. Read the Result in `test.md`:
   - `verified` → report, done.
   - `failed`, or `partial` with a failing check or regression → step 6 (failing checks).
   - `partial` with only `skipped` or `not-run` checks → list them. AskUserQuestion: Run them (Recommended) | Accept as is. Run → re-run test with consent, then read the Result again. 3 re-runs done → offer only Accept as is | Stop; Stop → `Test: partial (<k> not run)`, `Result: stopped`, `Stopped: Test: <k> checks not run`, report, stop. Accept → report, done.
6. **Iterate.** 3 passes done → `Result: stopped`, `Stopped: Iterate: 3 passes`, list the failing checks from `test.md` (or the blockers from `fix.md`), report, stop; repeated misses point to a wrong root cause. Else start the next pass by entry:
   - Re-assess (from step 4, Deviations say the assessment is wrong) → run `speckit-bug-assess slug=<slug> <extracted evidence> Evidence from .specify/bugs/<slug>/test.md and fix.md`. Verdict `invalid` → `Result: stopped`, `Stopped: Iterate: re-assess verdict invalid`, report, stop. Else step 4.
   - Retry (from step 4, Retry with my input) → run `speckit-bug-fix slug=<slug> <user input>`, then branch on its Status as in step 4.
   - Failing checks (from step 5, `failed` or failing `partial`) → tell the user which checks failed, run `speckit-bug-fix slug=<slug> Address the failing checks in .specify/bugs/<slug>/test.md`, then branch on its Status as in step 4.

## Output

```text
Bug: .specify/bugs/<slug>/
Verdict: <valid | likely valid, needs reproduction | invalid>; severity <level>
Fix: <applied | partial | not-applied> (<passes> pass(es), <n> re-assess)
Test: verified | partial (accepted) | partial (<k> not run) | failed (<k> checks failing) | not run
Result: done | stopped | cancelled
Stopped: <step>: <reason> | none
```
