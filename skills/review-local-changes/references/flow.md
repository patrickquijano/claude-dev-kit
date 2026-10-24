# Resolve findings

Step 7. Edits stay in the working tree and uncommitted; nothing is committed or posted.

## Collect

List every kept finding, every reviewer with `Status: incomplete`, and every `Checks:` entry that failed or was skipped. Keep original ids and severities; never hide or relabel one.

## Analyze

Per item write: impact, recommended fix (smallest change at the root cause), real alternatives only, and the validation that proves it. Classify:

- `safe`: in scope, reversible, no new behavior or dependency, and none of its files is in Dirty (`snapshot.md`): a fix would rewrite the user's own uncommitted edits. A finding whose file is in Dirty is `needs-decision` ("file has uncommitted changes"), asked in `## Ask` with the fix as an option; an explicit yes there lets the fix run on that Dirty file (the implementer is told to keep the user's other edits), and under `--yes` it stays `open`.
- `needs-decision`: several valid fixes, a scope or compatibility choice, or user input.
- `blocked`: out of scope, destructive, or needs access.

## Fix

Safe items only: spawn `cdk:plan-implementer` per item (briefs in `SKILL.md` `## Spawn briefs`); items with disjoint files spawn in one message (<=4 per message). Consume `Status:`, `Changed:`, `Deviations:`. Then spawn `cdk:change-verifier` kind `checks` and re-read each item's lines. A malformed return after the one respawn leaves the item (verifier: the affected items) `open`. Attribute a failing check to the item whose `Changed:` paths it names; a failure matching no item (pre-existing) is reported, not charged. Mark `resolved` only when `Status: done` and the check passes in this run; a skipped required check leaves it `open`. A failed validation: re-spawn with the failing lines as the fix list (the second and last attempt), else leave the item `open`; a `Question:` or `blocked` leaves it `open`. Max 2 attempts per item, shared with `## Ask`. Never weaken a check, delete a failing test, or suppress a warning.

## Ask

Skip under `--yes`. Otherwise one AskUserQuestion call (max 4 questions, one per item or tight group): 2-4 options each naming its effect, the recommended one first with "(Recommended)" and a reason, plus `Leave open`. A chosen fix runs as in `## Fix` (plan-implementer, then change-verifier; the 2 attempts per item are shared). Items left open and options declined go to `Resolution:`.

## Report

`Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted`. No item at all → `none` (run done) or `not run (<result>)` for a stop, cancel, or nothing-to-do. Open items do not change `Result:`.
