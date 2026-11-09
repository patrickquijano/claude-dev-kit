# Validate

Detail for steps 6–8: the change-set check, the verifier, the implementer's fix loop, and the iteration. Spawn briefs are in `SKILL.md`.

## Verify

Spawn the verifier (step 7), with the changed paths from the implementer's `Changed:`.

## Evidence

Map the verifier's return:

- `Goals:` → each goal `met`, `unmet`, or `unverified` with its evidence; an `unverified` goal counts as unmet for the Output. An `unverified` goal whose only proof is a `skipped` check goes to `Open:` and does not trigger step 8. An `unverified — no test` goal (code reading only, no test) goes to the fix list as a missing-test item.
- `Checks:` → the Output `Verify:` line, one entry per command.
- `Findings:` and failed checks → the fix list below.

```text
G1: met — <test path> passes | <command> output | <observed behavior>
G2: unmet — <what failed, file:line>
```

## Baseline

Step 5c runs the verifier once per run, before the first edit, and records each `[required]` check's result, first failing lines, and `Failing tests:` IDs. Step 8 re-entry never re-runs it, so a regression from an earlier round is never pre-existing.

- A check that failed at baseline and fails now with every failing test ID present at baseline is pre-existing: list it under `Open:`; it never enters the fix list or step 8.
- A failing test ID absent at baseline is a regression, wherever it falls in the output: send it to the fix list.
- No IDs reported (the tool prints none): compare the first failing lines instead (a check that fails now with no new failing lines is pre-existing; new failing lines are a regression) and note the fallback under `Open:`.
- Baseline fallback (no baseline run): a failure that cites only files this run did not change goes to `Open:` with the evidence.

## Fix

- Severity filter: the fix list holds only blocker and major findings plus new failures of `[required]` checks; minor findings go to `Open:`. Apply it per the spawn rule in `SKILL.md` (inline, one implementer, or parallel groups). Then spawn a fresh verifier on the new changed paths.
- An empty fix list ends the loop: go to step 8 or 9, no fix attempt and no verifier run.
- No progress: after each re-verify, stop the fix loop when a blocking item repeats from any earlier attempt in this pass (same path and same problem, lines may shift; or the same check with the same first failing line), or when the blocking count did not decrease. The pass ends and goes to step 8; if step 8 cannot re-enter, `Stopped: 7: no progress`.

## Change-set check

Run after every implementation (step 6 and each fix attempt); with parallel implementers, once after all returns. Without git, compare a fresh content snapshot of the write scope, or of the planned files when no scope was passed (the Dirty set is empty beyond it), with the pre-flight snapshot instead of `status`, `diff-stat`, and `dirty-diff`, and apply the same rules below. With git, run `status` and compare it with the pre-flight baseline, and run `diff-stat` to confirm the change set matches the approach. `status` cannot show further edits to an already-dirty file, so also run `dirty-diff` for each Dirty path and compare it with the output saved at pre-flight (an untracked Dirty path: re-read it with Read and compare with its pre-flight content). `status` also cannot see an ignored file or a path outside the repo.

- Planned means the union of the planned files across all rounds of this run; a path an earlier round planned and wrote is never unplanned.
- A newly changed path that is not planned, or a Dirty path whose diff changed and the picked approach does not name: never revert or remove it (that could drop the user's own edits); keep it and list the path under `Open:`.
- A changed path outside a passed write scope → the out-of-scope stop in `SKILL.md` Rules, Write scope.
- No git: also flag any path added or removed outside the snapshot (compare a fresh Glob of the root with the pre-flight root file list), and any path in `Changed:` that was not planned, under `Open:`. Edits to existing unplanned files stay undetected without git; note that under `Open:`.

## Iterate

- Re-enter when a goal is unmet or a check still fails after its fix attempts, excluding items already routed to `Open:` (pre-existing, skipped, out-of-run, minor): re-spawn the planner with the evidence (`SKILL.md` `## Spawn briefs`), then step 4.
- Round-level stop: when a round ends with no fewer unmet goals plus blocking items than the previous round, stop with `Stopped: 8: no progress`.
- The verify budget check runs before every verifier spawn (`Stopped: <step>: verify budget`).
- Count each re-entry as a round; the cap is in `## Rules`.
- Unattended runs re-enter without asking.

## Open

List in the Output `Open:` format: unmet goals, failed or skipped checks (a command that timed out is `skipped (timeout)`), minor findings, pre-existing failures, assumptions made under `--yes`, and failures outside this run's files.
