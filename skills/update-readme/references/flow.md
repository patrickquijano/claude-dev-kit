# Flow

Conditional detail for the workflow steps.

## Contents

- Pre-flight · Fallback · Confirm · Cancelled · Improve round · Leftovers

## Pre-flight

- Score-only (input `score`, or the request is score, review, or audit only): run steps 2, 6, 7, 9. Archetype = input's, else the analyst guess, no question.
- Score-only, no README at all → report it, suggest create mode, end `Result: nothing-to-do`.
- Only a non-`.md` README (`README`, `README.rst`, ...) → AskUserQuestion: Convert to README.md (Recommended) | Stop. Stop → `Result: nothing-to-do`. Convert → update mode on its content converted to Markdown; keep the old file and name it in `Converted from:`. In score-only, Convert leaves score-only (the only way out of it).

## Fallback

AskUserQuestion unavailable → ask the pending question as plain text with its options, end the turn, and take the next message as the answer. Never print a finished README in place of a pending question. Write unavailable → stop: `Result: stopped`, `Stopped: 5: write unavailable`. Unattended runs ask nothing: write the README, report `Confirmed: unattended`, omit unanswerable items and list them in `Omitted:`.

## Confirm

One AskUserQuestion at step 5, after the archetype, outline, and changed sections are printed. The text names each effect: `README.md` created or updated, the formatter run when facts `Formatter` is not none, and "never commits". One reason line cites the evidence: `Stale` facts fixed, `Omitted:` items, a rubric section filled with an explicit line.

- Options (Proceed → `Confirmed: yes`, or `revised <n>` after Revise rounds): **Proceed** · **Revise** (notes via Other → back to step 4) · **Stop** (`Result: cancelled`, `Confirmed: no (stopped)`).
- Recommend Revise when the draft still has an open or blocked item (an unanswered `Gaps:` item); else Proceed. The recommended option goes first with "(Recommended)".
- Revise cap 2; cap hit → offer only Proceed and Stop.
- The confirm covers this run's improve rounds; they print their `Map:` and need no new ask.
- Score-only never asks and never writes: `Confirmed: n/a (score-only)`.

## Cancelled

The user dismisses, cancels, or declines an AskUserQuestion this skill needs answered (a Gaps question, an analyst `Question:` ask, the write confirm, the Public | Private | Omit question, or an improver question) → stop at once, write and format nothing further, and print the Output with `Result: cancelled`, `Stopped: <step>: user cancelled`. A README already written stays; report it as `created` or `updated`. Choosing "Omit" is an answer, not a cancel; Stop at the confirm is a cancel (`Confirmed: no (stopped)`), and nothing is written.

## Improve round

Below 95 and rounds < 3: rounds + 1, then spawn the improver subagent (brief per `SKILL.md` step 8) with root, rubric path, README path, archetype, the scorer return (table and deductions), the facts block (answers merged), `Omitted:`, the round number, and last round's unresolved items. It edits `README.md` only.

- Its `Question:` or `Questions:` → AskUserQuestion with an "Omit" option (max 4 per call); re-spawn once with the answers, in the same round. Unattended runs ask nothing: add them to `Omitted:`. Its `Blocked:` items go to `Open:`.
- Show its `Map:`, `Proactive:`, and `Expected:`, format its `Files changed:` (step 5), then score again (step 6) and report (step 7).

## Leftovers

After the loop ends (pass, or cap reached), list each row of the last scorer return's `Deductions` in `Open:` as `criterion (lost pts): scorer fix`, plus each improver `Blocked:` item as `<ID>: reason`. Pass with no deductions and no `Blocked:` items → `Open: none`. Do not re-enter the loop or edit further; score-only never writes.
