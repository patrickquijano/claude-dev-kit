---
name: fix-spec-kit-bug
description: Fix a bug with the GitHub Spec Kit bug extension from a stack trace, error or warning, URL, or bug report. Extract the evidence, then chain speckit-bug-assess, speckit-bug-fix, and speckit-bug-test, re-running fix (or assess when the assessment proves wrong) until the test verifies the fix, up to 3 passes. Use when the user asks to fix, triage, or assess a bug with Spec Kit.
argument-hint: '<stack trace | error | URL | bug report>'
---

# Fix Spec Kit Bug

Input: $ARGUMENTS

## Rules

- Invoke each step with the Skill tool as `speckit-bug-<command>`, one at a time. Wait for each step to finish; the bug extension registers no hooks, so steps do not chain themselves.
- Pass `slug=<slug>` to every step after assess. All three commands share the slug and write only to `.specify/bugs/<slug>/`.
- Relay every question a speckit skill asks to the user with AskUserQuestion. Never invent answers; the fix must reflect the user's intent. Exception, pre-approved by this workflow: on pass 2 and later, answer yes to overwriting `assessment.md`, `fix.md`, and `test.md` in the current slug.
- Never edit `.specify/` templates or `.claude/skills/speckit-*/`; Spec Kit overwrites them on upgrade.
- Issue → check `## Known issues` first. Fix for a recurring or workflow-blocking issue → append `- <symptom> → <fix>` to source SKILL.md (repo path, not plugin cache); not writable → print line for user.

## Workflow

1. **Preflight.** Any of `.claude/skills/speckit-bug-{assess,fix,test}/` missing → name the missing ones, tell the user to run `/cdk:setup-spec-kit`, stop. Input empty → AskUserQuestion for the stack trace, error, URL, or bug report.
2. **Extract.** Read the input and pull out each kind of evidence present: stack trace, error or warning message, URL, and bug report (symptom, expected versus actual, reproduction steps). None found → AskUserQuestion for one. Show the found items in a short list.
3. **Assess.** Run `speckit-bug-assess <extracted evidence>`, keeping URLs verbatim; assess fetches and merges them with the text. Take the slug from its `Slug:` line. Verdict `invalid` → report the output below, stop; fix refuses an invalid verdict.
4. **Fix.** Run `speckit-bug-fix slug=<slug>`. Status `not-applied` or `partial` with Deviations saying the assessment is wrong → go to step 6.
5. **Test.** Run `speckit-bug-test slug=<slug>`. Read the Result in `test.md`:
   - `verified` → report, done.
   - `failed`, or `partial` with a failing check or regression → go to step 6.
   - `partial` with only `skipped` or `not-run` checks → list them. AskUserQuestion: Run them (Recommended) | Accept as is. Run → re-run test with consent, then read the Result again. Accept → report, done.
6. **Iterate.** One pass = fix, then test. 3 passes done → stop, list the failing checks from `test.md`; repeated misses point to a wrong root cause. Else:
   - fix.md Deviations says the assessment is wrong → run `speckit-bug-assess slug=<slug> <extracted evidence> Evidence from .specify/bugs/<slug>/test.md and fix.md`, then step 4.
   - Else → tell the user which checks failed, run `speckit-bug-fix slug=<slug> Address the failing checks in .specify/bugs/<slug>/test.md`, then step 5.

## Output

```text
Bug: .specify/bugs/<slug>/
Verdict: <valid | likely valid, needs reproduction | invalid>, severity <level>
Fix: <applied | partial | not-applied> (<passes> pass(es), <n> re-assess)
Test: verified | partial (accepted) | failed (<k> checks failing) | not run
```

## Known issues

- none
