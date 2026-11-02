# Fix

Steps 4 and 5 of `SKILL.md`: planning every finding, applying the plan, and measuring the delta.

## Contents

- Plan · Coverage map · Implement · Delta

## Plan

More than 3 findings or more than 3 files → spawn the `cdk:implementation-planner` subagent (fallback: a read-only subagent that plans the fixes from the files); otherwise plan inline with the same step format. Spawn with the root, every finding (id, file, line, evidence, fix), and the allowed edit set (files in the reviewed diff, plus new or clean files a step names). Brief: each step is prefixed `[F-id]` with the file, line, and exact change; take the recommended approach, no question; list the other approaches. Return at most 100 lines. A malformed block → respawn once, then plan inline.

## Coverage map

Every finding id must appear in a step. An unmapped id → respawn the planner with those ids, once; ids still unmapped are planned inline, then any left go under `Open:`. Alternatives from the planner go under `Open:`.

## Implement

Write the distinct step files to `<scratch>/paths.txt`. Run `verify` on them; `ok` false → `Result: stopped`. Run `snapshot`. Count distinct files: more than 3 → spawn the `cdk:plan-implementer` subagent (fallback: a subagent that applies the plan); otherwise apply each step inline with Edit or Write. Brief for the implementer: root; the `[F-id]` steps; the planned file list; edit only those files; add or update tests for changed behavior; never weaken, skip, or delete a test; a needed outside edit → `Question:` with `Status: partial`. Return at most 40 lines: `Status:`, `Changed:`, `Tests:`, `Deviations:`, `Self-check:`. `Deviations:` and `unmet` go under `Open:`; `Question:` or `blocked` → `Open:` and skip those ids.

## Delta

After implementing, run `status` and compare it with the step-1b baseline plus `<scratch>/paths.txt`; a path already dirty at the baseline is also compared by content against its `head/` copy, so an edit to it counts as changed; append each new changed path to `paths.txt` before `delta`, else list it under `Open:`. A newly changed path that the manifest lists as skipped for a sensitive name is not appended to `paths.txt`; list it by name only under `Open:`. Run `delta` with the round number on `<scratch>/paths.txt`. Its hunks feed the re-review (`review.md`). A path `delta` lists as skipped (`not snapshotted`, `not a regular file`, `outside root`) is never re-reviewed: list it under `Open:`. A changed file outside the planned set is listed under `Open:`, never reverted.
