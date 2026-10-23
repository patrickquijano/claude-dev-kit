# Score

Step 6 of `SKILL.md`: mechanical check first, then rubric scoring, then report and improve rounds.

## Run the check

- Run `check-agent` from `commands.md` with the agent file and `--scope`. It prints `{ok, errors, warnings}`; exit 0 ok, 1 errors, 2 bad usage (fix the call, do not retry blindly).
- Each finding has `id`, `rubric`, `file`, `line`, `message`. A warning is not an error, but the scorer judges it.

## Spawn the scorer

Spawn `cdk:rubric-scorer` with: `kind: agent`, the agent file, `${CLAUDE_SKILL_DIR}/references/rubric.md`, scope, the check JSON verbatim, and the spawning skill's path when one exists.

## Report

After each score, show the score table, the deductions (largest first), and `Contract:`, and any open `errors`. Nothing to fix, or the 3-round cap reached → leave the loop.

## Improve round

1. Spawn `cdk:rubric-improver` with: `kind: agent`, the agent file, `${CLAUDE_SKILL_DIR}/references/rubric.md`, `frontmatter.md`, `body.md`, and `decide.md` paths, scope, the check JSON, the scorer return with `Contract:`, the spawning skill's path, the model, effort, and color answers, round number, and last round's unresolved items. It edits only the agent file; this skill edits nothing for score fixes.
2. Its `Questions:` go to AskUserQuestion, each with an Omit option and a Stop option; re-spawn once with the answers. `Blocked:` items, including `Contract:` mismatches, go to `Open:`; the spawning skill is never edited.
3. Show its `Map`, `Proactive`, and `Expected`.
4. Re-run `check-agent` and rescore, then Report. Stop early when a round changes no file or the score does not rise. At most 3 rounds in total (shared with Rules); never edit an agent only to silence a finding.
5. Plugin scope → run `validate-plugin` once from the plugin root; a failure goes to `Open:` with no retry.

## Contract

The scorer reads the spawning skill read-only and reports mismatches (inputs the skill does not pass, Return fields it does not use). This skill never edits the skill; each mismatch goes to `Open:`.

## Open

`Open:` starts from the scorer's `Gaps:` and lists what is left after the cap: remaining `errors` (id, file:line), rubric deductions (ID and fix), unresolved warnings, contract mismatches, and anything unverified that was omitted. `none` when empty.
