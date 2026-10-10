# Resolve findings

Shared by every `cdk:` skill with a **Resolve findings.** workflow step, placed last before any **Report** step. The skill names its `scope` and `sources`; this file holds the procedure, so the skill adds no further issue-handling text. It runs once, after the skill's own capped loops, and never re-enters them.

- `scope: edit` = the skill may change files it already owns or writes (its own outputs, configs, tests). `scope: ask-only` = the skill never edits code (reviews, posting, rebase, orchestrators): it analyzes and asks, and acts only on what the skill itself owns (for example a PR or MR title or body it created).
- `sources` = the Output fields and agent returns that carry findings: failed or skipped checks, remaining gaps, suspected bugs, blockers, skipped or reverted items, open review findings, unresolved decisions, open threads, and warnings.
- No source holds an item → skip the step; print `Findings: none`.

## Collect

1. List every item from the sources, keeping its original id, severity, and status. Never drop, merge away, relabel, or hide one; an item the user already accepted earlier in the run stays listed as `accepted`, not as resolved.
2. Orchestrators (skills that chain `cdk:` skills) collect only what the chained skills' `Findings:` lines left `open`; they never re-analyze or re-fix a chained skill's items.

## Analyze

Per item, before any change, write:

- Impact: what breaks or stays wrong if left.
- Recommended fix: the smallest change that addresses the root cause, within the skill's scope.
- Alternatives: only real ones, each with its trade-off.
- Validation: the exact check that proves the fix (the skill's own command or Output check).

Classify each item `safe` (in scope, reversible, no new behavior or dependency), `needs-decision` (several valid fixes, scope or compatibility choice, or user input), or `blocked` (out of scope, destructive, needs access, or `scope: ask-only`).

## Resolve

`scope: edit` only, `safe` items only: apply the fix, then re-run the item's validation. Mark `resolved` only when that validation passes in this run; a check that is skipped, unavailable, or not re-run leaves the item `open` and says why. Never claim a resolution from reading the edit. A failed validation → undo that edit, try the next alternative once, else leave the item `open`. Never weaken a check, delete a failing test, suppress a warning, or edit generated or third-party files to clear an item.

## Ask

All `needs-decision` and `blocked` items, in one AskUserQuestion call (at most 4 questions per call, one per item or per tightly related group; further calls until each item is asked once). Each question: 2–4 concrete options naming their effect, the recommended one first with "(Recommended)" and a one-sentence objective reason, and a `Leave open` option. A chosen fix of a `scope: edit` skill runs as in Resolve, once. Under an unattended token (`--yes`, `--auto`, `auto`, `self-review`, or when chained by another skill) ask nothing: the items stay `open` and are reported with their recommended fix.

## Caps

One Collect, one Analyze, one Resolve pass; at most 2 fix attempts per item; one Ask round; an item is never asked twice. Anything still failing is `open`, never retried and never re-labeled. No jump back to an earlier workflow step. Cap hit → print the Output with the remaining items as `open`.

## Output

Add one line before `Result:`: `Findings: <n> resolved, <m> open (<id: reason; recommended fix>, …), <k> accepted | none | not run (stopped)`; a run that stops before this step prints `not run (stopped)`, and its stop reason is the open item. Existing Output lines keep reporting their own data, updated to the final status; `Findings:` carries only resolution status. Open items never change `Result:`; the skill's own rules decide it.
