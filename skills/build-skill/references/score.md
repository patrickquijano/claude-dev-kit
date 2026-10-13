# Score

Step 6 of `SKILL.md`: mechanical check first, then rubric scoring, then fixes.

## Run the check

- Run `check-skill` from `commands.md` with `<skill-dir>` and `--kind` (`task`, `reference`, or `background-only`). It prints `{ok, errors, warnings}`; exit 0 ok, 1 errors, 2 bad usage (fix the call, do not retry blindly).
- Each finding has `id`, `rubric`, `file`, `line`, `message`. A warning (such as `name-actor`) is not an error but the scorer judges it.

## Spawn the scorer

Spawn `cdk:skill-scorer` with: skill dir, `${CLAUDE_SKILL_DIR}/references/rubric.md`, scope, kind, invocation flags, and the check JSON verbatim. The scorer scores the "S" criteria from the JSON and judges the rest.

## Fix loop

1. Fix every `errors` entry first, then rubric deductions, largest first, in the skill's own files only.
2. Re-run `check-skill` and rescore. At most 3 rounds in total (shared with Rules); never edit a skill only to silence a finding.
3. Plugin scope → run `validate-plugin` once from the plugin root; a failure goes to `Gaps:` with no retry.

## Gaps

`Gaps:` starts from the scorer's `Gaps:` and lists what is left after the cap: remaining `errors` (id, file:line), rubric deductions (ID and fix), and unresolved warnings. `none` when empty.
