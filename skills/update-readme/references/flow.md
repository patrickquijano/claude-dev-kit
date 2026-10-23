# Flow

Conditional detail for the workflow steps.

## Contents

- Pre-flight · Fallback · Improve round · Leftovers

## Pre-flight

- Score-only (input `score`, or the request is score, review, or audit only): run steps 2, 6, 7. Archetype = input's, else the analyzer guess, no question.
- Score-only, no README at all → report it, suggest create mode, end `Result: nothing-to-do`.
- Only a non-`.md` README (`README`, `README.rst`, ...) → AskUserQuestion: Convert to README.md (Recommended) | Stop. Stop → `Result: nothing-to-do`. Convert → update mode on its content converted to Markdown; keep the old file and name it in the Output. In score-only, Convert leaves score-only (the only way out of it).

## Fallback

AskUserQuestion or Write unavailable → ask the pending question as plain text with its options, end the turn, and take the next message as the answer. Never print a finished README in place of a pending question. Unattended runs (chained) ask nothing: omit unanswerable items and list them in `Omitted:`.

## Improve round

Below 95 and rounds < 3: rounds + 1, then spawn `cdk:rubric-improver` with root, rubric path, README path, archetype, the scorer return (table and deductions), the facts block (answers merged), `Omitted:`, the round number, and last round's unresolved items. It edits `README.md` only.

- Its `Questions:` → AskUserQuestion with an "Omit" option (max 4 per call); re-spawn once with the answers. Unattended runs ask nothing: add them to `Omitted:`. Its `Blocked:` items go to `Open:`.
- Show its `Map:`, `Proactive:`, and `Expected:`, format its `Files changed:` (step 5), then score again (step 6) and report (step 7).

## Leftovers

After the loop ends (pass, or cap reached), list each `Remaining gaps:` deduction in `Open:` as `criterion (lost pts): scorer fix`. Do not re-enter the loop or edit further; score-only never writes.
