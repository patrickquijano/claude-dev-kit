# Validate

Detail for steps 7–9: the change-set check, the verifier, the implementer's fix loop, and the iteration. Spawn briefs are in `SKILL.md`.

## Verify

Spawn the verifier (step 8), with the changed paths from the implementer's `Changed:`.

## Evidence

Map the verifier's return:

- `Goals:` → each goal `met`, `unmet`, or `unverified` with its evidence; an `unverified` goal counts as unmet for the Output.
- `Checks:` → the Output `Verify:` line, one entry per command.
- `Findings:` and failed checks → the fix list below.

```text
G1: met — <test path> passes | <command> output | <observed behavior>
G2: unmet — <what failed, file:line>
```

## Fix

- **Plan mode (each round).** Before each fix round (a fix attempt, or a step 9 re-entry) call `EnterPlanMode` (load it with ToolSearch if deferred). Put the round's items (cause, chosen fix) and the files each touches in the plan, then `ExitPlanMode`; apply only what was approved. Plan mode already active → write the plan to its plan file. Rejection → revise and call `ExitPlanMode` again, at most 3 times → `Result: cancelled`, `Stopped: 8: plan rejected`. Declined, unavailable, or unattended (not `--yes`) → no fix is applied; the items go under `Open:`. `--yes` skips it (the flag is the approval, never for a Dirty path).
- Re-spawn the implementer per Spawn briefs in `SKILL.md` with a fix list of every finding and failed check in files this run changed. Then spawn a fresh verifier on the new changed paths.
- A failure in a file this run did not change → do not send it; list it under `Open:` with the evidence.

## Change-set check

Run after every implementer return (step 7 and each fix round). Run `status` and compare it with the pre-flight baseline, and run `diff-stat` to confirm the change set matches the approach. `status` cannot show further edits to an already-dirty file, so also run `dirty-diff` for each Dirty path and compare it with the output saved at pre-flight (an untracked Dirty path: re-read it with Read and compare with its pre-flight content).

- A newly changed path that is not planned: AskUserQuestion `Revert it` (`restore-path`; an untracked new file is removed with `remove-new`) | `Keep it` | `Stop`; unattended → leave it and list it under `Open:`.
- A Dirty path whose diff changed and the approved plan does not name: never `restore-path` it (that would drop the user's own edits). AskUserQuestion `Keep it` | `Stop`; unattended → `Result: stopped`, `Stopped: 7: dirty path edited`, with the path under `Open:`.

## Iterate

- Re-enter when a goal is unmet or a check still fails after its fix attempts: re-spawn the planner with the evidence (`SKILL.md` `## Spawn briefs`), then step 5.
- Count each re-entry as a round; the cap is in `## Rules`.
- Unattended runs re-enter without asking; each round's fixes still follow `## Fix` plan mode.

## Open

List in the Output `Open:` format: unmet goals, failed or skipped checks, assumptions made under `--yes`, and failures outside this run's files.
