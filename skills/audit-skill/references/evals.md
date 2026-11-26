# Evals

## Contents

- Routing cases · Behavior cases

## Routing cases

| id | prompt | expected route | pass |
| --- | --- | --- | --- |
| trigger-audit | "audit my commit-changes skill" | audit-skill | Resolves `skills/commit-changes/SKILL.md`; prints the checklist report |
| no-trigger-deps | "audit my npm dependencies" | not this skill | Skill is not loaded |
| no-trigger-build | "build a new skill that tidies logs" | cdk:build-skill | Skill is not loaded; `cdk:build-skill` handles it |

## Behavior cases

| id | prompt | expected behavior | pass |
| --- | --- | --- | --- |
| missing-input-asks | `/cdk:audit-skill` | Asks for the path | One AskUserQuestion; never guesses a skill |
| yes-no-input | `/cdk:audit-skill --yes` | Stops without a question | No question; `Result: stopped`, `Stopped: 1: no input` |
| cannot-interact | `/cdk:audit-skill` with no path, headless (no question tool, no user to reply) | Stops without guessing | Nothing written; `Result: stopped`, `Stopped: <step>: cannot interact` |
| report-only | `/cdk:audit-skill --report-only <skill>` | Reports only | Totals line and table; no score, no question, no edit, no backup; `Skills:` item ends `(report-only)`; `git status` unchanged |
| default-flow | `/cdk:audit-skill <skill with one Fail>` | Report, score, approve, fix, re-audit | Spawns `cdk:rubric-scorer` kind `skill-checklist`; asks approval; one `cdk:implement-spec` call; one report-only re-audit |
| not-checked-informational | A skill with no `when_to_use` and no `scripts/` | Marks conditional checks Not checked | F7 and X1–X3 are Not checked with a reason; T1–T2 Not checked; none is counted as a Pass or a Fail |
| scorer-missing | `cdk:rubric-scorer` is unavailable | Skips the score | `Not scored: definition not found`; the audit and the fixes go on |
| scorer-mismatch | A scorer return whose Fail count differs from the report | Respawns once | One respawn; still wrong → `Not scored: <reason>` |
| plugin-batch | `/cdk:audit-skill <plugin dir>` with one failing skill | Audits every skill | One combined report; the Fail never stops another skill; a score table per skill |
| approval-per-skill | A plugin batch with Fails in two skills | Asks once per skill | One multi-select question per skill, at most 4 options per question and 4 questions per call |
| backups-scratchpad | An approved fix | Backs up before editing | Backups under `<scratchpad>/audit-skill-backups/<skill>/`, never beside the file; `Backups:` lists them |
| implement-conflict-stops | `cdk:implement-spec` sets `disable-model-invocation: true` | Stops before the fix | `Result: stopped`, `Stopped: 6: implement-spec conflict`; no manual edit |
| implement-missing-stops | The `cdk:implement-spec` SKILL.md is absent | Stops, no manual fix | `Result: stopped`; fixes under `Open:`; no manual edit |
| reaudit-still-fail | An approved check still Fail after the fix | Stops without a loop | One re-audit only; `Result: stopped`, `Stopped: 7: still failing` |
| scripts-untouched | A Fail in `scripts/` | Reports it, never edits it | Listed under `Open:`; not offered for approval; no `scripts/` file changes |
| bak-ignored | A skill folder holding `SKILL.md.bak` | Ignores the backup | The `.bak` file is read by no check |
| no-pass-without-reading | A check whose file cannot be read | Never passes it | Not checked with `Unverified: <what is missing>` |
