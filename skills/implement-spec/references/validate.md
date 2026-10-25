# Validate

Detail for steps 7–9: the change-set check, the verifier, the implementer's fix loop, and the iteration. Spawn briefs are in `SKILL.md`.

## Verify

Spawn the verifier per Spawn briefs in `SKILL.md`, with the changed paths from the implementer's `Changed:`. It reviews the diff, finds the documented checks (CLAUDE.md `Commands`, rules files, manifest scripts), runs them in check mode, and judges each goal; a kind with no documented command comes back `skipped`, never invented.

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
- Up to 3 attempts per pass; each attempt is one implementer re-spawn plus one verifier run.
- A failure in a file this run did not change → do not send it; list it under `Open:` with the evidence.
- Never let a test be weakened, skipped, or deleted to get green; reject such a change and re-send the finding.

## Change-set check

Run after every implementer return (step 7 and each fix round). Run `status` and compare it with the pre-flight baseline, and run `diff-stat` to confirm the change set matches the approach. `status` cannot show further edits to an already-dirty file, so also run `dirty-diff` for each Dirty path and compare it with the output saved at pre-flight (an untracked Dirty path: re-read it with Read and compare with its pre-flight content).

- A newly changed path that is not planned: AskUserQuestion `Revert it` (`restore-path`; an untracked new file is removed with `remove-new`) | `Keep it` | `Stop`; unattended → leave it and list it under `Open:`.
- A Dirty path whose diff changed: never `restore-path` it (that would drop the user's own edits). AskUserQuestion `Keep it` | `Stop`; unattended → `Result: stopped`, `Stopped: 7: dirty path edited`, with the path under `Open:`.

## Iterate

- Re-enter step 5 when a goal is unmet or a check still fails after its fix attempts, passing along the evidence.
- Count each re-entry as a round; round 3 ending with a gap stops the loop.
- Unattended runs re-enter without asking.

## Open

List what is left as `<id: severity, reason; recommended fix>`: unmet goals, failed or skipped checks, assumptions made under `--yes`, and failures outside this run's files.
