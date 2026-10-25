# Flow

Conditional detail for the workflow steps.

## Contents

- Pre-flight · Plan mode · Fallback · Cancelled · Improve round · Leftovers

## Pre-flight

- Score-only (input `score`, or the request is score, review, or audit only): run steps 2, 6, 7, 9. Archetype = input's, else the analyst guess, no question.
- Score-only, no README at all → report it, suggest create mode, end `Result: nothing-to-do`.
- Only a non-`.md` README (`README`, `README.rst`, ...) → AskUserQuestion: Convert to README.md (Recommended) | Stop. Stop → `Result: nothing-to-do`. Convert → update mode on its content converted to Markdown; keep the old file and name it in `Converted from:`. In score-only, Convert leaves score-only (the only way out of it).

## Plan mode

Runs once, right after pre-flight passes. Unattended (no way to ask) → `Plan mode: skipped (unattended)`; score-only → `skipped (score-only)`.

- Plan mode already active → `already active`, stay in it. Otherwise load `EnterPlanMode` with ToolSearch if it is deferred, then call it. The user declines it, or the tool is unavailable → `declined`, `Result: stopped`, `Stopped: 4: plan mode declined`, `Confirmed: no (stopped)`; nothing is written.
- Steps 2–4 run inside plan mode: they only read, ask with AskUserQuestion, and spawn the read-only analyst.
- At the end of step 4 write the plan file: the archetype, the outline, the changed sections with their diff (the full content in create mode), and the effects (`README.md` created or updated, the `format-readme` run, "never commits"). Call `ExitPlanMode`; approval (`Confirmed: yes`) covers this run's improve rounds, then go to step 5; they print their `Map:` and need no new ask.
- Rejection → revise per the feedback and call `ExitPlanMode` again; 3 rejections → `Result: cancelled`, `Stopped: 4: plan rejected`, `Confirmed: no (stopped)`.
- Any end before step 5 prints the Output with `Plan mode:` as reached (`skipped (<reason>)` when never entered).

## Fallback

AskUserQuestion unavailable → ask the pending question as plain text with its options, end the turn, and take the next message as the answer. Never print a finished README in place of a pending question. Write unavailable → stop: `Result: stopped`, `Stopped: 5: write unavailable`. Unattended runs ask nothing: write the README, report `Confirmed: unattended`, omit unanswerable items and list them in `Omitted:`.

## Cancelled

The user dismisses, cancels, or declines an AskUserQuestion this skill needs answered (a Gaps question, an analyst `Question:` ask, the Public | Private | Omit question, or an improver question) → stop at once, write and format nothing further, and print the Output with `Result: cancelled`, `Stopped: <step>: user cancelled`. A README already written stays; report it as `created` or `updated`. Choosing "Omit" is an answer, not a cancel.

## Improve round

Below 95 and rounds < 3: rounds + 1, then spawn the improver subagent (brief per `SKILL.md` step 8) with root, rubric path, README path, archetype, the scorer return (table and deductions), the facts block (answers merged), `Omitted:`, the round number, and last round's unresolved items. It edits `README.md` only.

- Its `Question:` or `Questions:` → AskUserQuestion with an "Omit" option (max 4 per call); re-spawn once with the answers, in the same round. Unattended runs ask nothing: add them to `Omitted:`. Its `Blocked:` items go to `Open:`.
- Show its `Map:`, `Proactive:`, and `Expected:`, format its `Files changed:` (step 5), then score again (step 6) and report (step 7).

## Leftovers

After the loop ends (pass, or cap reached), list each row of the last scorer return's `Deductions` in `Open:` as `criterion (lost pts): scorer fix`, plus each improver `Blocked:` item as `<ID>: reason`. Pass with no deductions and no `Blocked:` items → `Open: none`. Do not re-enter the loop or edit further; score-only never writes.
