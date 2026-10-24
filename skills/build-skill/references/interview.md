# Interview

Steps 5 and 7 of `SKILL.md`: ask only what the evidence cannot settle, then gate the write on a confirmed summary. Step 6 (scope and kind, `decide.md`) sits between them so the gate shows the target path.

## Coverage

Objective, triggers, inputs, outputs, scope, constraints, success criteria, subagents. A topic the request or the evidence already answers is skipped. Update and improve ask only about unresolved intent; improve asks only about the findings picked at the baseline.

## Questions

- One decision per question; ask only what blocks a good result. At most 4 per batch, at most 3 rounds (Rules).
- Each question has 2–4 mutually exclusive options. Each option carries a weight (all weights sum to 100) and a one-line justification citing a `path`, doc, or skill from the evidence. The top weight is marked Recommended and listed first.
- No evidence for a question: say "no evidence", give no weights and no recommendation.
- Every batch has Stop (`Result: cancelled`). The user can always pick Other.
- No AskUserQuestion in the tool list → ask the same questions as numbered plain text and wait for replies.

## Gate

Summarize in at most 7 lines: objective, triggers, inputs, outputs, scope, constraints, and `Target: <absolute path>`. Take the path from the locate return (`Target exists:` line or the match path), with `~` expanded to the home directory. AskUserQuestion Confirm | Revise | Stop.

- Revise → re-ask only the changed topics (counts toward the 3 rounds), then show the summary again; Revise after round 3 → `Result: stopped`.
- Update mode: the summary adds the change list (each edit: file, section, change), built from the files read at step 3; Confirm covers it, and `Edit` follows only after it.
- Confirm covers the target path: no file is created or modified before it (Rules).
