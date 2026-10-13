# Score

Step 6 of `SKILL.md`: mechanical check first, then rubric scoring, then fixes.

## Run the check

- Run `check-agent` from `commands.md` with the agent file and `--scope`. It prints `{ok, errors, warnings}`; exit 0 ok, 1 errors, 2 bad usage (fix the call, do not retry blindly).
- Each finding has `id`, `rubric`, `file`, `line`, `message`. A warning is not an error, but the scorer judges it.

## Spawn the scorer

Spawn `cdk:agent-scorer` with: the agent file, `${CLAUDE_SKILL_DIR}/references/rubric.md`, scope, the check JSON verbatim, and the spawning skill's path when one exists.

## Fix loop

1. Fix every `errors` entry first, then rubric deductions, largest first, in the agent file only.
2. Re-run `check-agent` and rescore. At most 3 rounds in total (shared with Rules); never edit an agent only to silence a finding.
3. Plugin scope → run `validate-plugin` once from the plugin root; a failure goes to `Gaps:` with no retry.

## Contract

The scorer reads the spawning skill read-only and reports mismatches (inputs the skill does not pass, Return fields it does not use). This skill never edits the skill; each mismatch goes to `Gaps:`.

## Gaps

`Gaps:` starts from the scorer's `Gaps:` and lists what is left after the cap: remaining `errors` (id, file:line), rubric deductions (ID and fix), unresolved warnings, contract mismatches, and anything unverified that was omitted. `none` when empty.
