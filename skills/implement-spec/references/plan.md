# Plan

Formats and asks for steps 4–5.

## Goals

Print the planner's `Goals` and `Non-goals` in this format; print each goal as a numbered line with one acceptance criterion:

```text
G1: <outcome, one line>
  Accept: <test | command | observable behavior that proves it>
```

- A criterion names something that can be run or observed; "works well" is not one.
- Add `Non-goals:` with what the change will not do, one line each.
- A goal without a checkable criterion → rewrite it or ask in step 3.

## Approaches

Print the planner's `Approaches` as 2–3 cards in this format, the recommended one first; the `Pick` ask stays in the main thread:

```text
A1 (recommended): <summary, one line>
  Files: <paths touched>
  Trade-offs: <gain>; <cost>
  Risk: low | medium | high — <why>
```

Ask one AskUserQuestion:

- Options: `<A1 name> (Recommended)` | `<A2 name>` | `<A3 name>` | `Stop`.
- Each option description holds its trade-off in one line; the recommendation carries its reason.
- Only one workable approach → print it with why no other fits, and skip the ask.
- `--yes` picks the recommended approach and records it. `Stop` → `Result: cancelled`.

## Printed plan

After the pick, print the plan (restatement, goals with criteria, non-goals, chosen approach, the planner's `Steps` and `Risks`, and each Dirty path the approach must edit, or none), then go to step 6 with no wait.

## Re-entry from step 8

- Re-spawn the planner first (`validate.md` `## Iterate`).
- Revise only what the unmet criterion or failed check points at: the goals, the approach, or both.
- Keep met goals as they are; carry over what was learned into the revised card.
- A revised approach is asked again as above; an unattended run keeps the recommended one.
