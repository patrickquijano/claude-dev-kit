# Evals

Cases for `update-rules`: create, score-only, conflicts, and the subagent fallbacks. Test each on Haiku, Sonnet, and Opus.

## Contents

- Template · Cases · Running per model

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                    | prompt                                                          | expected                                          | pass                                                                                                                                     |
| --------------------- | --------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| create-set            | "Write CLAUDE.md for this repo." (none exists)                  | Fills the template, plan approval, writes, scores | Plan file plus `ExitPlanMode` approval, no other confirm; only `CLAUDE.md` and `.claude/rules/**` written; always-loaded lines under 200 |
| score-only            | "Score my CLAUDE.md."                                           | Scores without writing                            | `Confirmed: n/a (score-only)`; no file changed; deductions listed                                                                        |
| conflict-ask          | "Update the rules." (two files disagree)                        | Asks, never resolves silently                     | One question per conflict with keep A, keep B, merge; unattended keeps the existing side                                                 |
| known-issues-move     | "Update the rules." (a `Known issues` section exists)           | Moves it to auto memory                           | `feedback` memory plus `MEMORY.md` pointer listed in `Files:`; section removed                                                           |
| subagents-unavailable | "Update the rules." (no subagent can be spawned)                | Gathers facts, scores, and improves inline        | Same Output block; no stop                                                                                                               |
| below-pass            | "Improve my rules." (score under 95)                            | Improves in rounds                                | At most 3 improve rounds; leftovers under `Open:`                                                                                        |
| rescore-always        | "Improve my rules." (improver returns `Expected: 80→98/100`)    | Rescores after every improve round                | `Score:` comes from the round's fresh rescore, never `Expected:`; the last round at the cap is rescored                                  |
| plan-entered          | "Update the rules."                                             | Plan mode before any write                        | Enters plan mode after pre-flight; plan file plus `ExitPlanMode` before the first write; approval is the only confirm                    |
| plan-declined         | "Update the rules." (the user declines plan mode)               | Stops without writing                             | `Plan mode: declined`, `Result: stopped`, `Stopped: 4: plan mode declined`; nothing written or deleted                                   |
| delete-in-plan        | "Update the rules." (a tracked file has only duplicate content) | Deletes only a file the plan lists                | The plan lists the file for deletion; no Delete \| Keep question; unattended deletes nothing                                             |
| fix-round-plan-mode   | "Update the rules." (first score below 95)                      | Improve round enters plan mode first              | `EnterPlanMode` before any improver edit; a rejected plan applies nothing                                                                |
| auto-invoke           | A natural request for the action, no `/cdk:` command            | Claude loads the skill on its own                 | The skill runs; its existing confirm or plan approval still precedes any write or push                                                   |
| grill-close-call      | A decision question whose top two totals are ≤5 apart           | Table before the question; no Recommended         | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked                     |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
