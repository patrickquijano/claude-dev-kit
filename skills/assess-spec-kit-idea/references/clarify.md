# Clarify

Step 7 detail.

2 re-runs done → list the blocking questions, `Result: stopped`, `Stopped: Clarify: 2 re-runs, blocking questions open`, then step 8, stop; repeated blocks point to missing evidence only the user can gather. Else show the `**Blocking questions**` and `**Revisit stage**` from `decision.md`. Collect answers with AskUserQuestion, one question per blocking question, each with a Stop option (free text via Other). Answers → run `speckit-assess-<revisit stage> slug=<slug> <answers>` (intake also gets the idea from step 2), run every later stage through decide with `slug=<slug>`, then read the verdict again as in step 5. Any Stop → `Result: stopped`; run step 8 on the blocking questions still open without re-asking them or re-entering step 7, then print the Output with `Stopped: Clarify: user stopped` and end.
