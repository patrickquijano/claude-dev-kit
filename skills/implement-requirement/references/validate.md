# Validate

Detail for steps 8–9 (the verifier, the implementer's fix loop, and the iteration).

## Verify

Spawn `cdk:implementation-verifier` with the root, the goals with their acceptance criteria, and the changed paths from the implementer's `Changed:`. It reviews the diff, finds the documented checks (CLAUDE.md `Commands`, rules files, manifest scripts), runs them in check mode, and judges each goal; a kind with no documented command comes back `skipped`, never invented.

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

- Send the implementer (`cdk:requirement-implementer`) a fix list of every finding and failed check in files this run changed: id, file, line, evidence, recommendation. Then spawn a fresh verifier on the new changed paths.
- Up to 3 attempts per pass; each attempt is one implementer re-spawn plus one verifier run.
- A failure in a file this run did not change → do not send it; list it under `Open:` with the evidence.
- Never let a test be weakened, skipped, or deleted to get green; reject such a change and re-send the finding.

Run `diff-stat` to confirm the change set matches the approach; an unplanned file is reverted or justified.

## Iterate

- Re-enter step 5 when a goal is unmet or a check still fails after its fix attempts, passing along the evidence.
- Count each re-entry as a round; round 3 ending with a gap stops the loop.
- Unattended runs re-enter without asking.

## Open

List what is left as `<id: severity, reason; recommended fix>`: unmet goals, failed or skipped checks, assumptions made under `--yes`, and failures outside this run's files.
