# Validate

Detail for steps 6–8: the change-set check, the verifier, the implementer's fix loop, and the iteration. Spawn briefs are in `SKILL.md`.

## Verify

Spawn the verifier (step 7), with the changed paths from the implementer's `Changed:`.

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

- Re-spawn the implementer per Spawn briefs in `SKILL.md` with a fix list of every finding and failed check in files this run changed. Then spawn a fresh verifier on the new changed paths.
- A failure in a file this run did not change → do not send it; list it under `Open:` with the evidence.

## Change-set check

Run after every implementer return (step 6 and each fix round). Run `status` and compare it with the pre-flight baseline, and run `diff-stat` to confirm the change set matches the approach. `status` cannot show further edits to an already-dirty file, so also run `dirty-diff` for each Dirty path and compare it with the output saved at pre-flight (an untracked Dirty path: re-read it with Read and compare with its pre-flight content).

- A newly changed path that is not planned, or a Dirty path whose diff changed and the picked approach does not name: never revert or remove it (that could drop the user's own edits); keep it and list the path under `Open:`.

## Iterate

- Re-enter when a goal is unmet or a check still fails after its fix attempts: re-spawn the planner with the evidence (`SKILL.md` `## Spawn briefs`), then step 4.
- Count each re-entry as a round; the cap is in `## Rules`.
- Unattended runs re-enter without asking.

## Open

List in the Output `Open:` format: unmet goals, failed or skipped checks, assumptions made under `--yes`, and failures outside this run's files.
