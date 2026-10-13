# Resolve findings

Step 7. Edits stay in the working tree and uncommitted; nothing is committed or posted.

## Collect

List every kept finding, every reviewer with `Status: incomplete`, and every `Checks:` entry that failed or was skipped. Keep original ids and severities; never hide or relabel one.

## Analyze

Per item write: impact, recommended fix (smallest change at the root cause), real alternatives only, and the validation that proves it. Classify:

- `safe`: in scope, reversible, no new behavior or dependency.
- `needs-decision`: several valid fixes, a scope or compatibility choice, or user input.
- `blocked`: out of scope, destructive, or needs access.

## Fix

Safe items only: edit the file, then run the item's validation (re-read the lines, or re-run the failing check once). Mark `resolved` only when it passes in this run. A failed validation: restore the original text, try one alternative, else leave the item `open`. Max 2 attempts per item. Never weaken a check, delete a failing test, or suppress a warning.

## Ask

Skip under `--yes`. Otherwise one AskUserQuestion call (max 4 questions, one per item or tight group): 2-4 options each naming its effect, the recommended one first with "(Recommended)" and a reason, plus `Leave open`. A chosen fix runs as in Fix. Items left open and options declined go to `Resolution:`.

## Report

`Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted`. No item at all → `none` (run done) or `not run (<result>)` for a stop, cancel, or nothing-to-do. Open items do not change `Result:`.
