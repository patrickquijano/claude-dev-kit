# Iterate

Step 6 detail.

3 passes done → `Result: stopped`, `Stopped: Iterate: 3 passes`, list the failing checks from `test.md` (or the blockers from `fix.md`), then step 7, stop; repeated misses point to a wrong root cause. Else start the next pass by entry:

- Re-assess (from step 4, Deviations say the assessment is wrong) → run `speckit-bug-assess slug=<slug> <extracted evidence> Evidence from .specify/bugs/<slug>/test.md and fix.md`. Verdict `invalid` → `Result: stopped`; run step 7 on the failing checks from `test.md` and the blockers from `fix.md` without re-entering the loop, then print the Output with `Stopped: Iterate: re-assess verdict invalid` and end. Else step 4.
- Retry (from step 4, user input collected) → run `speckit-bug-fix slug=<slug> <user input>`, then branch on its Status as in step 4.
- Failing checks (from step 5, `failed` or failing `partial`) → tell the user which checks failed, run `speckit-bug-fix slug=<slug> Address the failing checks in .specify/bugs/<slug>/test.md`, then branch on its Status as in step 4.
