# Flow

Conditional detail for the workflow steps.

## Contents

- Pre-flight · Host · Fallback · Questions · Cancelled · Verify · Improve round · Leftovers

## Pre-flight

- Search case-insensitively for `README.*` in the root, `.github/`, `.gitlab/`, and `docs/`.
  - One found → edit it in place; never relocate it.
  - Several found → AskUserQuestion which one, the root file Recommended.
  - None → say so, then AskUserQuestion: Create at root (Recommended) | Stop. Stop → `Result: nothing-to-do`.
- Score-only (input `score`, or the request is score, review, or audit only): run steps 3, 13, 14, 16. Type = input's, else the top detected type, no question.
- Score-only, no README at all → report it, suggest create mode, end `Result: nothing-to-do`.
- Only a non-`.md` README (`README`, `README.rst`, ...) → AskUserQuestion: Convert to README.md (Recommended) | Stop. Stop → `Result: nothing-to-do`. Convert → update mode on its content converted to Markdown; keep the old file and name it in `Converted from:`. In score-only, Convert leaves score-only (the only way out of it).

## Host

Map the `remote-url` result to `github`, `gitlab`, `bitbucket`, `gitea`, or `generic` by its hostname. An unknown host or no remote → `generic`. The main thread decides; the analyst's `Host:` line is ignored.

## Fallback

AskUserQuestion unavailable → ask the pending question as plain text with its options, end the turn, and take the next message as the answer. Never print a finished README in place of a pending question. Write unavailable → stop: `Result: stopped`, `Stopped: 11: write unavailable`. The fallback list is numbered, one option per number. Unattended runs ask nothing: pick each Recommended option, write the files, report `Confirmed: unattended`, omit unanswerable items and list them in `Omitted:`.

## Questions

The template, length, and layout questions share one format.

- 2–4 options, each with a percent weight; weights sum to 100; the highest is first and marked Recommended.
- Each option has a justification of at most 2 sentences: one advantage, one drawback, and a cited source key.
- State: "Weights are heuristic scores from detected signals, not measured data." Length questions say "Line limits are community heuristics, not measured data."
- Then stop and wait for the answer.

## Cancelled

The user dismisses, cancels, or declines an AskUserQuestion this skill needs answered (a template, length, or layout question, a Gaps question, an analyst `Question:` ask, the Public | Private | Omit question, or an improver question) → stop at once, write and format nothing further, and print the Output with `Result: cancelled`, `Stopped: <step>: user cancelled`. A README already written stays; report it as `created` or `updated`. Choosing "Omit" is an answer, not a cancel.

## Verify

- Run `count-lines` on every written file; each must be at most the max.
- Check that every relative link in the README set resolves to an existing file, and its anchor, if any, to a heading.
- Report `Verify: lines <pass | fail>; links <resolved>/<total>`. A failure gets one inline fix and a re-verify; what still fails goes to `Open:`.

## Improve round

Below 95 and rounds < 3: rounds + 1.

**Plan mode (each round).** Before applying round k's fixes, call `EnterPlanMode` (load it with ToolSearch if deferred). Put the round's items (scorer deduction, cause, chosen fix) and the files each touches (the README set) in the plan, then `ExitPlanMode`. Apply only what was approved. Plan mode already active → write the plan to its plan file. Rejection → revise and call `ExitPlanMode` again, at most 3 times → `Result: cancelled`, `Stopped: 15: plan rejected`. Declined or unavailable → no fix is applied; the deductions go under `Open:`. Unattended runs skip it and follow `## Fallback`. Then spawn the improver subagent (brief per `SKILL.md` step 15) with root, rubric path, README path, archetype, the chosen max, the scorer return (table and deductions), the facts block (answers merged), `Omitted:`, the round number, and last round's unresolved items. It edits the README and its split files only, each at most the max.

- Its `Question:` or `Questions:` → AskUserQuestion with an "Omit" option (max 4 per call); re-spawn once with the answers, in the same round. Unattended runs ask nothing: add them to `Omitted:`. Its `Blocked:` items go to `Open:`.
- Show its `Map:`, `Proactive:`, and `Expected:`, format its `Files changed:` (step 11), then score again (step 13) and report (step 14).

## Leftovers

After the loop ends (pass, or cap reached), list each row of the last scorer return's `Deductions` in `Open:` as `criterion (lost pts): scorer fix`, plus each improver `Blocked:` item as `<ID>: reason`. Pass with no deductions and no `Blocked:` items → `Open: none`. Do not re-enter the loop or edit further; score-only never writes.
