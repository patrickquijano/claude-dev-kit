# Evals

Cases for `delete-branches`: scope, the protected set, paging, and failure reporting. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                   | prompt                                                                             | expected                                | pass                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| not-a-repo           | "Delete my old branches." (not a git repository)                                   | Stops                                   | `Stopped: 1: not a git repository`; no delete command                                   |
| no-remote            | "Delete my old branches." (repository with no remote)                              | Local scope only                        | Scope question skipped; no `delete-remote` or `fetch-all`; `Remote: none`               |
| origin-missing       | "Delete my old branches." (remote named `upstream`, no `origin`)                   | Asks which remote                       | A question names the remotes; the chosen one is used                                    |
| protected-excluded   | "Delete my old branches." (default, ruleset, current, and worktree branches exist) | Never offers them                       | None appears in any question; all are in `Protected:`                                   |
| host-tooling-missing | "Delete my old branches." (no GitHub MCP, `gh` not installed)                      | Continues with the default branch alone | `Host protection: unavailable (<reason>)`; the default branch is still excluded         |
| paging-9-candidates  | "Delete my old local branches." (9 candidates)                                     | One call of 3 questions                 | Options split 4+3+2; no question has 1 option                                           |
| not-fully-merged     | "Delete my old local branches." (a selected branch is unmerged)                    | Asks before forcing                     | A force question lists the rejected branches; `branch -D` runs only for the chosen ones |
| remote-rejected      | "Delete my old remote branches." (the host rejects one delete)                     | Reports and moves on                    | `Remote failed:` holds git's exact error line; no retry                                 |
| plan-declined        | "Delete my old branches." (decline the plan)                                       | Deletes nothing                         | `Result: stopped`; `Stopped: 0: plan mode declined`; no delete command                  |
| auto-invoke          | A natural request such as "clean up my merged branches", no `/cdk:` command        | Claude loads the skill on its own       | The skill runs; the selection questions still precede any delete                        |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
