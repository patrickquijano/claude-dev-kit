# Evals

Cases for `release-plugin`: the happy path, the review cap, and a mid-chain stop. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                 | prompt                                                                                                    | expected                               | pass                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| happy-path         | `/release-plugin` (one `feat` commit pending, review returns no findings)                                 | Runs steps 1-14                        | One plan approval; steps 1-4 run planner, ExitPlanMode, implementer; no skill invoked; `Merged: yes`; `Result: done` |
| review-cap         | `/release-plugin 0.9.0` (every review round still reports findings)                                       | Stops before the merge after 3 rounds  | `Review rounds: 3/3`; `Merged: no`; `Open:` lists the findings; `Result: stopped`                                    |
| step-stops         | `/release-plugin` (the commit step ends `Result: cancelled`)                                              | Stops on the first non-done step       | `Stopped: 5: ...`; no push, PR, or tag; `Steps:` lists 1-4                                                           |
| nothing-pending    | `/release-plugin` (clean tree, no commits ahead)                                                          | Stops at the pre-flight                | `Result: nothing-to-do`; no skill step run                                                                           |
| bad-version-arg    | `/release-plugin 0.0.1` (current is higher)                                                               | Rejects the override                   | `Stopped: 0: ...`; plugin.json unchanged                                                                             |
| planner-question   | `/release-plugin` (the README skill needs a length answer)                                                | Main thread asks, respawns the planner | AskUserQuestion asks it; planner respawned with the answer; no write before ExitPlanMode                             |
| edit-verify-cap    | `/release-plugin` (the rules score stays below 95 for 3 rounds)                                           | Stops after 3 edit rounds              | `Stopped: 1: ...`; `Open:` lists the deductions; no commit                                                           |
| no-pause           | `/release-plugin` (happy path)                                                                            | Runs to the last step without a prompt | The only user inputs are gate answers; no turn ends between steps; `Steps:` lists 1-13                               |
| resume-after-clear | The approved step-1 plan, after a context clear, starts with `## Release run` (`Current: 1 update-rules`) | Finishes step 1, then runs 2-14        | No new step-0 plan; step 1 is verified; `Step 1/14 … → next 2` printed; `Steps:` lists 1-13                          |
| no-auto-invoke     | "We should ship a new release soon." (no command)                                                         | Claude does not load the skill         | The skill does not run                                                                                               |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
