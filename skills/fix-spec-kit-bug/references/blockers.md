# Blockers

Step 4 detail, for Status `not-applied` with a reason other than a wrong assessment.

List the blockers from `fix.md`. Collect the input with AskUserQuestion: one option per blocker (option text = how to resolve it), plus Stop, free text via Other; then step 6 (retry) with that answer as `<user input>`. Stop → `Test: not run`, `Result: stopped`; run step 7 on the `fix.md` blockers without re-entering the loop, then print the Output with `Stopped: Fix: not-applied, user stopped` and end.
