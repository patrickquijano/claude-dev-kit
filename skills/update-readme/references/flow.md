# Flow

Conditional detail for the workflow steps.

## Contents

- Pre-flight · Host · Fallback · Questions · Cancelled · Verify · Improve round · Leftovers

## Pre-flight

- Search case-insensitively for `README.*` in the root, `.github/`, `.gitlab/`, and `docs/`.
  - One found → edit it in place; never relocate it.
  - Several found → AskUserQuestion which one, the root file Recommended.
  - None → say so and create it at the root.
- Score-only (input `score`, or the request is score, review, or audit only): run steps 1, 2, 3, 4 (no question), 13, 14, 16. Type = input's, else the top detected type.
- Score-only, no README at all → report it, suggest create mode, end `Result: nothing-to-do`.
- Only a non-`.md` README (`README`, `README.rst`, ...) → update mode on its content converted to Markdown; keep the old file and name it in `Converted from:`. Score-only never writes, so it scores the file as is.

## Host

Map the `remote-url` result to `github`, `gitlab`, `bitbucket`, `gitea`, or `generic` by its hostname. An unknown host or no remote → `generic`. The main thread decides; the analyst's `Host:` line is ignored, so one mapping applies whether or not the analyst ran.

## Fallback

AskUserQuestion unavailable → ask the pending question as plain text with its options, end the turn, and take the next message as the answer. Never print a finished README in place of a pending question. The fallback list is numbered, one option per number. Unattended runs ask nothing: pick each Recommended option, write the files, omit unanswerable items and list them in `Omitted:`.

## Questions

The template, length, and layout questions share one format.

- 2–4 options, each with a percent weight; weights sum to 100; the highest is first and marked Recommended.
- Each option has a justification of at most 2 sentences: one advantage, one drawback, and a cited source key.
- State: "Weights are heuristic scores from detected signals, not measured data." Length questions say "Line limits are community heuristics, not measured data."
- Then stop and wait for the answer.

## Cancelled

The user dismisses, cancels, or declines an AskUserQuestion this skill needs answered (a template, length, or layout question, a Gaps question, an analyst `Question:` ask, the Public | Private | Omit question, an improve-round fact-gap question, the `Extend 3 more rounds | Stop` question) → stop at once, write nothing further, and print the Output with `Result: cancelled`, `Stopped: <step>: user cancelled`. A README already written stays; report it as `created` or `updated`. Choosing "Omit" or "Stop" is an answer, not a cancel. A cancel reported by implement-spec is different: SKILL.md Rules map it to `Result: stopped`, `Stopped: <step>: user cancelled`.

## Verify

- Run `count-lines` on every written file; each must be at most the max.
- Check that every relative link in the README set resolves to an existing file, and its anchor, if any, to a heading.
- Report `Verify: lines <pass | fail>; links <resolved>/<total>`. A failure gets one implement-spec fix goal and a re-verify; what still fails goes to `Open:`.

## Improve round

Entered from SKILL.md step 15: rounds + 1.

Build the Spec brief per SKILL.md Rules (memory lookup and the shared fields: non-goals, `Write scope:`, `Approach:`, `Tests:`, no formatter or linter), plus the improve-round extras: root, rubric path, README path, archetype, the chosen max, one goal per deduction (ID, file:line, Before → After) (Before read verbatim with Read from the target at the deduction's file:line, because the scorer return carries only the fix) with last round's unresolved items first, the facts block (answers merged), and `Omitted:` as non-goals; each quoted field goes in a fenced block per the SKILL.md Rules fence clause. Invoke implement-spec with it; it edits the README and its split files only, each at most the max.

- Before invoking implement-spec, resolve each fact gap (license, URL, version, contact, badge) → AskUserQuestion with an "Omit" option (max 4 per call). `--yes` or unattended runs ask nothing: add it to `Omitted:`. implement-spec's `Open:` items and cap stops go into the leftovers; the caller still rescores and reaches the cap ask.
- Then rescore (step 13) and report (step 14), per SKILL.md Rules.

## Leftovers

After the loop ends (pass, or cap reached), list each row of the last scorer return's `Deductions` in `Open:` as `ID (lost pts) file:line: fix`, plus each implement-spec `Open:` item as `<ID>: reason`, and print each scorer `Waived:` row under `Waived:`. Pass with no deductions and no implement-spec `Open:` items → `Open: none`. Do not re-enter the loop or edit further; score-only never writes.
