# Evals

## Contents

- Routing cases · Behavior cases

## Routing cases

| id               | prompt                                 | expected route | pass                                              |
| ---------------- | -------------------------------------- | -------------- | ------------------------------------------------- |
| trigger-audit    | "audit my codebase-explorer subagent"  | audit-subagent | Resolves `agents/codebase-explorer.md`; scores it |
| no-trigger-skill | "audit my commit-changes skill"        | audit-skill    | Skill is not loaded; audit-skill handles it       |
| no-trigger-build | "build a new subagent that scans logs" | build-subagent | Skill is not loaded; build-subagent handles it    |

## Behavior cases

| id                  | prompt                                                        | expected behavior                         | pass                                                                                                                           |
| ------------------- | ------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| no-args-select      | `/cdk:audit-subagent`                                         | Lists subagents, asks paged multi-select  | At most 4 options per question and 4 questions per call; nothing selected → `nothing-to-do`                                    |
| dirty-target        | `/cdk:audit-subagent <agent>` (tracked file modified)         | Scores and edits the target               | Applies the VERIFIED fixes; `Stopped: none`                                                                                    |
| cap-reached         | A subagent still REJECTED after 3 rounds                      | Asks the extension question               | Asks the `Extend 3 more rounds` or `Stop` ask; `--yes` stops and the rest stays under `Open:`                                  |
| yes-no-args         | `/cdk:audit-subagent --yes`                                   | Selects nothing                           | No question asked; `Result: nothing-to-do`; assumption under `Decisions:`; `Open: none`                                        |
| parallel-score      | `/cdk:audit-subagent a b`                                     | One scorer per subagent in one message    | Both spawns in a single message; totals re-summed with `node -e`                                                               |
| fresh-rescore       | A subagent fixed in round 1                                   | Rescores from current files               | Reported score comes from the round-2 scorer, none carried over                                                                |
| implement-handoff   | A subagent REJECTED with 1+ VERIFIED fixes                    | Writes through implement-spec             | One implement-spec invocation per subagent; goals are the fix IDs; no planner or implementer named                             |
| no-format-lint      | Any fix round                                                 | Runs no formatter or linter               | The Spec brief says so; no format or lint command runs                                                                         |
| no-extra-spawn      | Any fix round                                                 | Spawns only the allowed subagents         | Only scorer and researcher spawns; no other subagent                                                                           |
| scorer-agent        | `/cdk:audit-subagent <agent>`                                 | Scores through the plugin scorer          | Spawns `cdk:rubric-scorer` with kind `subagent-audit`, not a generic subagent                                                  |
| accepted-continues  | A subagent at 92 ACCEPTED with VERIFIED fixes                 | Keeps fixing                              | Runs another fix round; ends only with no open item                                                                            |
| unverified-research | A subagent with UNVERIFIED suggestions                        | Researches before asking                  | Spawns `cdk:topic-researcher`; a confirmed source promotes the fix and it is applied                                           |
| unverified-ask      | UNVERIFIED suggestion, researcher finds no source             | Asks per item                             | Asks `Apply anyway \| Decline \| Provide a source or fact`, Recommended first                                                  |
| yes-decisions       | `--yes` with an UNVERIFIED suggestion left                    | Takes the Recommended option              | No question; `Decisions:` filled; `Open: none`                                                                                 |
| stall-ask           | A fix round changes no file or raises no score                | Asks a decision question                  | Stall becomes an open item and is asked about, not a silent stop                                                               |
| g7-unconfirmed      | Docs no longer say subagents cannot spawn subagents           | Reports G7 UNCONFIRMED without failing it | Gates show G7 UNCONFIRMED; the verdict is not forced to FAIL (gate) by G7                                                      |
| edit-scope          | A fix round on one agent                                      | Changes only the target file              | `git diff --stat -- <file>` shows only that file; no other subagent or skill edited                                            |
| line-coverage       | A scorer return lacks a section-10 row for a target file      | Respawns, then scores inline              | Missing or short file → scorer respawned once, then that file scored inline                                                    |
| fix-per-deduction   | A deduction has no fix or `no fix:` reason                    | Respawns the scorer                       | Scorer respawned once; still missing → fix written inline                                                                      |
| memory-reuse        | An open item matches a `feedback` memory `cdk-fix-subagent-…` | Reuses the stored fix                     | `MEMORY.md` read before step 6; the memory's fix is in the goal's After text; a confirmed fix updates one memory, no duplicate |
| waived-item         | A would-be deduction whose fix changes no behavior            | Waives it                                 | Scores full, no fix ID, listed under `Waived:`, absent from `Open:`                                                            |
| ledger-no-drop      | A rescore omits an earlier open item                          | Keeps it open in the ledger               | The item stays open, is researched or asked about; `Items:` open count includes it                                             |
| score-only          | `/cdk:audit-subagent --score-only <subagent>`                 | Scores and reports, never edits           | No implement-spec call and no memory write; no step 8 question; `Open:` lists every item and `Waived:` lists the waived ones   |
