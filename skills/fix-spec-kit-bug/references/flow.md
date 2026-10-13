# Flow

Detail for steps 4 to 6.

## Fix status

Read Status in `fix.md`:

- `applied` → step 5.
- `not-applied` or `partial`, Deviations say the assessment is wrong → step 6 (re-assess).
- `partial`, other reason → step 5; the test shows what the applied part fixes.
- `not-applied`, other reason → blockers: AskUserQuestion with one option per blocker (option text = how to resolve it), plus Stop, free text via Other. An answer → step 6 (retry) with it as `<user input>`. Stop → `Test: not run`, `Result: stopped`, `Stopped: Fix: not-applied, user stopped`; list the blockers in `Open:`, print the Output.

## Test result

Read Result in `test.md`:

- `verified` → `Result: done`, `Open: none`.
- `failed`, or `partial` with a failing check or regression → step 6 (failing checks).
- `partial` with only `skipped` or `not-run` checks → list them, re-run `speckit-bug-test slug=<slug>` with consent to run them, no ask, then read Result again. Max 3 re-runs per pass; after the third → `Test: partial (<k> not run)`, `Result: stopped`, `Stopped: Test: <k> checks not run`, list them in `Open:`.

## Iterate

3 passes done → `Result: stopped`, `Stopped: Iterate: 3 passes`; list the failing checks or blockers in `Open:`; repeated misses point to a wrong root cause. Else start the next pass by entry:

- Re-assess (Deviations say the assessment is wrong) → run `speckit-bug-assess slug=<slug> <extracted evidence> Evidence from .specify/bugs/<slug>/test.md and fix.md`. Verdict `invalid` → `Result: stopped`, `Stopped: Iterate: re-assess verdict invalid`, list failing checks and blockers in `Open:`. Else step 4.
- Retry (user input collected) → run `speckit-bug-fix slug=<slug> <user input>`, then branch as in `## Fix status`.
- Failing checks (from step 5) → tell the user which failed, run `speckit-bug-fix slug=<slug> Address the failing checks in .specify/bugs/<slug>/test.md`, then branch as in `## Fix status`.
