# Plan

Formats and asks for steps 2, 5–6.

## Plan mode

Step 2 runs once. `--yes` enters nothing, continues without plan mode (the flag is the approval, never for a Dirty path), and records `Plan mode: skipped (--yes)`.

- Plan mode already active → `already active`, stay in it. Otherwise load `EnterPlanMode` with ToolSearch if it is deferred, then call it. The user declines it, or the tool is unavailable → `declined`, `Result: stopped`, `Stopped: 2: plan mode declined`; nothing is edited.
- Steps 3–6 are read-only and run inside plan mode; the step 6 Pick ask stays.
- After the pick, write the plan file (restatement, goals with criteria, non-goals, chosen approach, and each Dirty path the approach must edit, or none) and call `ExitPlanMode`. Approval → step 7; it covers the Dirty paths the plan names, with no separate ask.
- Rejection → revise per the feedback and call `ExitPlanMode` again; each rejection counts toward the clarify cap.

## Goals

Print each goal as a numbered line with one acceptance criterion:

```text
G1: <outcome, one line>
  Accept: <test | command | observable behavior that proves it>
```

- A criterion names something that can be run or observed; "works well" is not one.
- Add `Non-goals:` with what the change will not do, one line each.
- A goal without a checkable criterion → rewrite it or ask in step 4.

## Approaches

Print 2–3 approach cards, the recommended one first:

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

## Re-entry from step 9

- Re-entry stays in the current mode and never re-enters plan mode.
- Revise only what the unmet criterion or failed check points at: the goals, the approach, or both.
- Keep met goals as they are; carry over what was learned into the revised card.
- A revised approach is asked again as above; an unattended run keeps the recommended one.
