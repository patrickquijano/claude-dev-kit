---
name: fix-spec-kit-bug
description: Fixes a bug with GitHub Spec Kit's bug extension (assess, fix, test, up to 3 passes) from a stack trace, error, URL, or report. Use only when the user explicitly asks to fix a bug with Spec Kit.
argument-hint: '<stack trace | error | URL | bug report>'
---

# Fix Spec Kit Bug

Input: $ARGUMENTS

## Rules

- Run each speckit step with the Skill tool in this main thread, one at a time, never via the Agent tool (a subagent has no AskUserQuestion). Wait for each to finish.
- Relay every question a speckit step asks with AskUserQuestion; never invent answers. Never edit `.specify/` templates or `.claude/skills/speckit-*/`.
- Pre-approved, answered without asking: on pass 2 and later, yes to overwriting `assessment.md`, `fix.md`, and `test.md` in the current slug; in step 5, yes to running skipped or not-run checks.
- Pass `slug=<slug>` to every step after assess. All three write only to `.specify/bugs/<slug>/`.
- Passes: one pass = fix, then test; the first fix + test is pass 1. A re-assess uses up a pass (re-assess, fix, test count as one). Every step 6 entry starts a new pass. Max 3 passes; test re-runs for skipped checks: max 3 per pass.
- Leftovers: no further loop. List each failing or not-run check (from `test.md`) and blocker (from `fix.md`) in `Open:` with its recommended fix; never re-run fix or test just to report.
- AskUserQuestion unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true`.

## Workflow

1. **Pre-flight.** `.specify/` and the three bug skill dirs must exist; else stop (`required-skills.md`). Input empty → AskUserQuestion for it.
2. **Extract.** Pull out the stack trace, error or warning, URL, and bug report (symptom, expected versus actual, steps). None → ask for one; none given or cancelled → `Result: cancelled`. Show the items.
3. **Assess.** Run `speckit-bug-assess <evidence>`, URLs verbatim; take the slug from its `Slug:` line. Verdict `invalid` → `Fix: not-applied (0 pass(es), 0 re-assess)`, `Test: not run`, `Result: stopped`, stop.
4. **Fix.** Run `speckit-bug-fix slug=<slug>`; branch on Status in `fix.md` (`flow.md` `## Fix status`).
5. **Test.** Run `speckit-bug-test slug=<slug>`; `verified` → done. Failing → step 6; only skipped or not-run checks → re-run (`flow.md` `## Test result`).
6. **Iterate.** 3 passes done → `Result: stopped`, `Stopped: Iterate: 3 passes`, stop. Else start the next pass (`flow.md` `## Iterate`).
7. **Report.** Fill `Open:` from `test.md` and `fix.md`; print the Output.

## Files

- For the bug skill list and the missing-setup stop, see `${CLAUDE_SKILL_DIR}/references/required-skills.md`.
- For fix status branches, test results, blockers, and the next pass, see `${CLAUDE_SKILL_DIR}/references/flow.md`.

## Output

```text
Bug: .specify/bugs/<slug>/
Verdict: <valid | likely valid, needs reproduction | invalid>; severity <level>
Fix: <applied | partial | not-applied> (<passes> pass(es), <n> re-assess)
Test: verified | partial (<k> not run) | failed (<k> checks failing) | not run
Open: <check or blocker: reason; recommended fix, …> | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
