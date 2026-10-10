# Resolve findings

Shared by every `cdk:` skill with a **Resolve findings.** workflow step, placed last before any **Report** step. The skill names its `scope` and `sources`; this file holds the procedure, so the skill adds only scope clarifications, never a second procedure. It runs once, after the skill's own capped loops, and never re-enters them.

- `scope: edit` = the skill may change files it already owns or writes (its own outputs, configs, tests). `scope: ask-only` = the skill never edits or posts anything in this step (reviews, posting, rebase, orchestrators): it analyzes, reports each item's recommended fix and who acts, and asks only for a choice no earlier step already offered.
- `sources` = the Output fields and agent returns that carry findings: failed or skipped checks, remaining gaps, suspected bugs, blockers, skipped or reverted items, open review findings, unresolved decisions, open threads, and warnings.
- No source holds an item → skip the step; print `Resolution: none`.

## Collect

1. List every item from the sources, keeping its original id, severity, and status. Never drop, merge away, relabel, or hide one; an item the user already accepted earlier in the run (for example a `Skip this tool` answer) stays listed as `accepted`, not as resolved.
2. Orchestrators (skills that chain `cdk:` skills) collect only what the chained skills' `Resolution:` lines left `open`; they never re-analyze or re-fix a chained skill's items.

## Analyze

Per item, before any change, write:

- Impact: what breaks or stays wrong if left.
- Recommended fix: the smallest change that addresses the root cause, within the skill's scope.
- Alternatives: only real ones, each with its trade-off.
- Validation: the exact check that proves the fix (the skill's own command or Output check).

Classify each item `safe` (in scope, reversible, no new behavior or dependency), `needs-decision` (several valid fixes, scope or compatibility choice, or user input), or `blocked` (out of scope, destructive, needs access, or `scope: ask-only`).

## Resolve

`scope: edit` only, `safe` items only: apply the fix, then re-run the item's validation. Mark `resolved` only when that validation passes in this run; a check that is skipped, unavailable, or not re-run leaves the item `open` and says why. Never claim a resolution from reading the edit. Re-running the item's validation (one scoped run of the skill's own check, a counted attempt) is not a jump back to an earlier step. A failed validation → undo that edit by re-applying the original text, try the next alternative once, else leave the item `open`. Never weaken a check, delete a failing test, suppress a warning, or edit generated or third-party files to clear an item.

## Ask

All `needs-decision` and `blocked` items, in one AskUserQuestion call (at most 4 questions per call, one per item or per tightly related group; further calls only to cover items not yet asked). Each question: 2–4 concrete options naming their effect, the recommended one first with "(Recommended)" and a one-sentence objective reason, and a `Leave open` option. A chosen fix of a `scope: edit` skill runs as in Resolve and counts as an attempt, allowed only while fewer than 2 were used. Never ask again a choice an earlier workflow step already offered (for example `Don't post`); report it as `open` instead. Under an unattended token (`--yes`, `--auto`, `auto`, `self-review`, or when chained by another skill) ask nothing: the items stay `open` and are reported with their recommended fix.

## Caps

One Collect, one Analyze, one Resolve pass; at most 2 fix attempts per item; one pass over the items in Ask; an item is never asked twice. Anything still failing is `open`, never retried and never re-labeled. No jump back to an earlier workflow step. Cap hit → print the Output with the remaining items as `open`.

## Output

Add one line before `Result:`: `Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)`; a run that ends early prints `not run (nothing-to-do | cancelled | stopped)`; on `stopped`, the stop reason is reported as an open item with its recommended fix and who acts. Existing Output lines keep reporting their own data, updated to the final status; `Resolution:` carries only resolution status. Open items never change `Result:`; the skill's own rules decide it.
