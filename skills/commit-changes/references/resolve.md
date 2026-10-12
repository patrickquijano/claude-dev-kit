# Resolve

Details step 11 (**Resolve findings**).

Only when a source holds an item (`Excluded:` secret-flagged files, `Commitlint:` skipped or `fail (<error line>)`, `not pushed` with no origin); otherwise skip it and print `Resolution: none` (`Result: done`) or `not run (stopped | nothing-to-do)` matching `Result:`. Runs after any stop from step 6 onward (commitlint cap, step 8 and 9 failures, push failure), on what is left; the pre-flight stop (step 1), cancels, and step 3 nothing-to-do print `not run`. Ask nothing and never edit, stage, or push anything here; report each item's impact, who acts (the user), and recommended fix.
