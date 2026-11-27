# Evals

## Contents

- Routing cases · Behavior cases

## Routing cases

| id | prompt | expected route | pass |
| --- | --- | --- | --- |
| trigger-audit | "audit my codebase-explorer subagent" | cdk:audit-subagent | Resolves `agents/codebase-explorer.md`; prints the checklist report |
| no-trigger-skill | "audit my commit-changes skill" | cdk:audit-skill | Skill is not loaded; `cdk:audit-skill` handles it |
| no-trigger-build | "build a new subagent that scans logs" | cdk:build-subagent | Skill is not loaded; `cdk:build-subagent` handles it |

## Behavior cases

| id | prompt | expected behavior | pass |
| --- | --- | --- | --- |
| missing-input-asks | `/cdk:audit-subagent` | Asks for the path | One AskUserQuestion; never guesses a subagent |
| yes-no-input | `/cdk:audit-subagent --yes` | Stops without a question | No question; `Result: stopped`, `Stopped: 1: no input` |
| cannot-interact | `/cdk:audit-subagent` with no path, headless (no question tool, no user to reply) | Stops without guessing | Nothing written; `Result: stopped`, `Stopped: <step>: cannot interact` |
| report-only | `/cdk:audit-subagent --report-only <subagent file>` | Reports only | Totals line and table; no score, no question, no edit, no backup; `Subagents:` item ends `(report-only)`; `git status` unchanged |
| default-flow | `/cdk:audit-subagent <subagent with one Fail>` | Report, score, approve, fix, re-audit | Spawns `cdk:rubric-scorer` kind `subagent-checklist`; asks approval; one `cdk:implement-spec` call; one report-only re-audit |
| not-checked-informational | A subagent with no `model`, `effort`, or `color` | Marks conditional checks Not checked | F9 is Not checked with a reason, and F8 is a Fail (house rule: always set); E1–E2 Not checked; a Not checked is neither a Pass nor a Fail |
| plugin-scope-fields | A plugin agent that sets `hooks` or `permissionMode` | Fails T4 | T4 Fail with the exact `file:line` and a fix that removes the field |
| version-gated-unverified | A subagent that sets `omitClaudeMd`, Claude Code version unknown | Never passes the gated field | F10 is Not checked with `Unverified: Claude Code version unknown` |
| scorer-missing | `cdk:rubric-scorer` is unavailable | Skips the score | `Not scored: scorer unavailable`; the audit and the fixes go on |
| scorer-mismatch | A scorer return whose Fail count differs from the report | Respawns once | One respawn; still wrong → `Not scored: <reason>` |
| plugin-batch | `/cdk:audit-subagent <plugin dir>` with one failing subagent | Audits every subagent | One combined report; the Fail never stops another subagent; a score table per subagent |
| approval-per-subagent | A plugin batch with Fails in two subagents | Asks once per subagent | One multi-select question per subagent, at most 4 options per question and 4 questions per call |
| backups-beside-file | An approved fix | Backs up before editing | Backup is `<file>.bak` beside the subagent file, never `.md`; `Backups:` lists it |
| implement-conflict-stops | `cdk:implement-spec` sets `disable-model-invocation: true` | Stops before the fix | `Result: stopped`, `Stopped: 6: implement-spec conflict`; no manual edit |
| implement-missing-stops | The `cdk:implement-spec` SKILL.md is absent | Stops, no manual fix | `Result: stopped`; fixes under `Open:`; no manual edit |
| reaudit-still-fail | An approved check still Fail after the fix | Stops without a loop | One re-audit only; `Result: stopped`, `Stopped: 7: still failing` |
| bak-ignored | An `agents/` folder holding `codebase-explorer.md.bak` | Ignores the backup | The `.bak` file is read by no check and is not a target; S4 passes |
| md-backup-fails | An `agents/` folder holding `codebase-explorer.bak.md` | Fails S4 | S4 Fail naming the file, since it loads as an agent |
| no-pass-without-reading | A check whose file cannot be read | Never passes it | Not checked with `Unverified: <what is missing>` |
| missing-self-check | A subagent whose steps go straight to `## Return` | Fails P7 | P7 Fail naming the step before the Return, with a proposed self-check step |
| disallowed-specifier | `disallowedTools: Bash(git push *)` while a step runs `git status` | Fails T2 | T2 Fail: the specifier removes the whole `Bash` tool; the evidence quotes the entry |
| autocompact-shorthand | `autoCompactWindow: 200k` | Fails F10 | F10 Fail: the value must be a plain integer of at least 100000; Unverified when the version is below v2.1.296 or unknown |
| house-rule-label | A subagent whose file stem differs from `name` | Fails S2 as a house rule | S2 Fail whose Evidence says "house rule", not a docs fact |
