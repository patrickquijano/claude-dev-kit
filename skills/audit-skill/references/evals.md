# Evals

## Contents

- Routing cases · Behavior cases

## Routing cases

| id               | prompt                               | expected route | pass                                                 |
| ---------------- | ------------------------------------ | -------------- | ---------------------------------------------------- |
| trigger-audit    | "audit my commit-changes skill"      | audit-skill    | Resolves `skills/commit-changes/SKILL.md`; scores it |
| no-trigger-deps  | "audit my npm dependencies"          | not this skill | Skill is not loaded                                  |
| no-trigger-build | "build a new skill that tidies logs" | build-skill    | Skill is not loaded; build-skill handles it          |

## Behavior cases

| id                  | prompt                                             | expected behavior                     | pass                                                                                                          |
| ------------------- | -------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| no-args-select      | `/cdk:audit-skill`                                 | Lists skills, asks paged multi-select | At most 4 options per question and 4 questions per call; nothing selected → `nothing-to-do`                   |
| dirty-target        | `/cdk:audit-skill <skill>` (tracked file modified) | Scores, never edits                   | Report shows the score; no edit; `Stopped: <skill>: dirty tracked file`                                       |
| cap-reached         | A skill still REJECTED after 3 rounds              | Asks the extension question           | Asks `Extend 3 more rounds \| Decline the rest \| Stop`; `--yes` declines the rest, logged under `Decisions:` |
| yes-no-args         | `/cdk:audit-skill --yes`                           | Selects nothing                       | No question asked; `Result: nothing-to-do`; assumption under `Decisions:`; `Open: none`                       |
| parallel-score      | `/cdk:audit-skill a b`                             | One scorer per skill in one message   | Both spawns in a single message; totals re-summed with `node -e`                                              |
| fresh-rescore       | A skill fixed in round 1                           | Rescores from current files           | Reported score comes from the round-2 scorer, none carried over                                               |
| owned-target        | `/cdk:audit-skill --owned <skill>` (file modified) | Scores and edits the dirty target     | Applies the VERIFIED fixes; no `Stopped: <skill>: dirty tracked file`                                         |
| plan-handoff        | A skill REJECTED with a plan of more than 3 files  | Plans, then spawns the implementer    | `cdk:implementation-planner` runs before `cdk:plan-implementer`; each step names a fix ID                     |
| fix-inline          | A skill REJECTED with a plan of 3 or fewer files   | Plans, then applies with Edit         | `cdk:implementation-planner` runs; fixes applied with Edit in plan order; no `cdk:plan-implementer` spawn     |
| no-extra-spawn      | Any fix round                                      | Spawns only the allowed subagents     | Only scorer, planner, implementer, and researcher spawns; no other subagent                                   |
| scorer-agent        | `/cdk:audit-skill <skill>`                         | Scores through the plugin scorer      | Spawns `cdk:rubric-scorer` with kind `skill-audit`, not a generic subagent                                    |
| accepted-continues  | A skill at 92 ACCEPTED with VERIFIED fixes         | Keeps fixing                          | Runs another fix round; ends only with no open item                                                           |
| unverified-research | A skill with UNVERIFIED fixes                      | Researches before asking              | Spawns `cdk:topic-researcher`; a confirmed source promotes the fix and it is applied                          |
| unverified-ask      | UNVERIFIED fix, researcher finds no source         | Asks per item                         | Asks `Apply anyway \| Decline \| Provide a source or fact`, Recommended first                                 |
| yes-decisions       | `--yes` with an UNVERIFIED fix left                | Takes the Recommended option          | No question; `Decisions:` filled; `Open: none`                                                                |
| stall-ask           | A fix round changes no file or raises no score     | Asks a decision question              | Stall becomes an open item and is asked about, not a silent stop                                              |
