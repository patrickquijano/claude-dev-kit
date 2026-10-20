# Score

Step 6 of `SKILL.md`: mechanical check first, then rubric scoring, then report and improve rounds.

## Run the check

- Run `check-skill` from `commands.md` with `<skill-dir>` and `--kind` (`task`, `reference`, or `background-only`). It prints `{ok, errors, warnings}`; exit 0 ok, 1 errors, 2 bad usage (fix the call, do not retry blindly). When the target is the cdk plugin itself, pass one `--allow` per path in `.claude/rules/skills.md` "Shared files" and give the scorer the same list; any other target gets none.
- Each finding has `id`, `rubric`, `file`, `line`, `message`. A warning (such as `name-actor`) is not an error but the scorer judges it.

## Spawn the scorer

Spawn `cdk:rubric-scorer` with: `kind: skill`, skill dir, `${CLAUDE_SKILL_DIR}/references/rubric.md`, scope, kind, invocation flags, and the check JSON verbatim. The scorer scores the "S" criteria from the JSON and judges the rest.

## Report

After each score, show the score table, the deductions (largest first), and any open `errors`. Nothing to fix, or the 3-round cap reached → leave the loop.

## Improve round

1. Spawn `cdk:rubric-improver` with: `kind: skill`, skill dir, `${CLAUDE_SKILL_DIR}/references/rubric.md`, `frontmatter.md` and `body.md` paths, `${CLAUDE_SKILL_DIR}/assets/templates.md`, scope, kind, invocation flags, the check JSON, the scorer return, allowlisted paths, answers and `Omitted:`, round number, and last round's unresolved items. It edits only the skill directory; this skill edits nothing for score fixes.
2. Its `Questions:` go to AskUserQuestion, each with an Omit option and a Stop option; re-spawn once with the answers. `Blocked:` items go to `Gaps:`.
3. Show its `Map`, `Proactive`, and `Expected`.
4. Re-run `check-skill` and rescore, then Report. Stop early when a round changes no file or the score does not rise. At most 3 rounds in total (shared with Rules); never edit a skill only to silence a finding.
5. Plugin scope → run `validate-plugin` once from the plugin root; a failure goes to `Gaps:` with no retry.

## Gaps

`Gaps:` starts from the scorer's `Gaps:` and lists what is left after the cap: remaining `errors` (id, file:line), rubric deductions (ID and fix), and unresolved warnings. `none` when empty.
