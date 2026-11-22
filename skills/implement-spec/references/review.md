# Review

Detail for steps 5d (plan review), 6c (changed-file review), and 7e (open items). Spawn briefs and caps are in `SKILL.md`.

## Contents

- Items · Pass · Limits · Plan review · Changed-file review · Open items

## Items

Each review looks for these kinds:

- `issue`: a bug, an unhandled edge, a wrong order of operations, or a goal the plan or change does not meet.
- `red-flag`: a security hole, a secret, data loss, or a Dirty or out-of-scope path.
- `redundant`: duplicated logic, a helper the repo already has, or dead code the change left.
- `misconfig`: a key, path, version, or default that differs from the repo's own config or the official docs.
- `enhancement`: a clearer, safer, or better-tested form of the change inside the planned files.

## Pass

One pass per step per round (Caps in `SKILL.md`):

1. Identify: list each item as `R<n> <kind> <path>:<line> — evidence`, so every item can be checked against the file.
2. Ground: cite evidence for each item (`path:line`, command output, or a URL). A fix that depends on an external fact (an API, a config key, a version, a default) gets one web search per topic, official docs preferred, URL cited. No search tool or no source → mark the item `unverified`, list it under `Open:`, and do not apply it, because a guessed fix can create the very misconfiguration the review hunts for.
3. Choose: compare the workable fixes for each item in the order correctness > security > clarity > simplicity and pick the best. A choice that changes a goal or the approach is a decision question (Rules, Decision questions; `--yes`: the recommended option, recorded under `Open:`), because goals and the approach are the user's call.
4. Apply: step 5d revises the plan; steps 6c and 7e pass the items as a fix list (id, file, line, evidence, recommendation) per the spawn rule, so the implementer treats them as requested changes, not unrelated refactors.
5. Record: an applied item shows in the plan or in `Files`; an item not applied goes under `Open:` with its reason and a recommended fix.

## Limits

- Edits stay in the planned files. Only step 5d may add a planned file, because it runs before step 6: the write scope and Dirty path rules apply, and without git the new file is snapshotted per step 1c. In steps 6c and 7e, an item that needs another file goes under `Open:`.
- Never apply an item that serves a listed non-goal, weakens, skips, or deletes a test, touches secrets or `.env` files, or edits a Dirty path the picked approach does not name.
- An enhancement that changes behavior adds or updates a test in the same fix, because the verifier flags a behavior change without a test as `major`.

## Plan review

Step 5d: read the printed plan, each planned file in full, and the step 5c check results, then run the pass. Revise only the plan (goals, `Edges`, steps, risks, approach, planned files); make no repo edit, so the baseline stays clean. Print the revised plan, or `Plan review: no changes`, then go to step 6.

## Changed-file review

Step 6c runs once per round, after step 6 only, never after a 7b fix attempt. Read each changed file around its hunks (with git, the `diff` row of `commands.md` per tracked changed path; Read for an untracked one), then run the pass. Applied items → run step 6b again before step 7. No item applied → go to step 7 with no step 6b re-run.

## Open items

Step 7e runs only when the 7b–7d loop ends with an empty fix list; a loop that ends on no progress or a cap goes to step 8.

- Fixable: minor findings, `Deviations`, and `Self-check: unmet` items whose fix stays in the planned files.
- Never fixable (stay under `Open:` with the reason): pre-existing failures, the `baseline` item, skipped or timed-out checks, Dirty, unplanned, or out-of-scope paths, `--yes` assumptions, and `unverified` review items.

Flow:

1. No fixable item, or no verify budget left → make no edit and go to step 8, because an edit with no verifier run would ship unverified.
2. Run the pass on the fixable items and apply them per the spawn rule.
3. Run step 6b.
4. Spawn one verifier (the budget check runs first; the run counts toward the verify budget).
5. A new blocker or major finding, or a new failure of a `[required]` check → step 8 as an unmet item; a new minor finding → `Open:`, with no second step 7e pass in the round.
