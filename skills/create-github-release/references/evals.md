# Evals

Cases for `create-github-release`: stops, confirmations, and idempotency. Test each on Haiku, Sonnet, and Opus.

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

| id             | prompt                                                                                            | expected                             | pass                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------- |
| happy-path     | "Create the release." (clean tree on the default branch, tips equal, changelog has 1.2.0, no tag) | One confirm, then tag, push, release | One Tag + push + release question; annotated tag at the verified commit; `Result: done` |
| behind-origin  | "Create the release." (local default is behind origin)                                            | Asks before fast-forwarding          | Asks Fast-forward \| Stop before `ff-default`; Stop gives `Result: cancelled`           |
| local-ahead    | "Create the release." (local default has unpushed commits)                                        | Stops                                | `Stopped: 2: default-not-synced`; no tag, no push                                       |
| release-exists | "Create the release." (the release for the version exists)                                        | Reports and stops untouched          | `Result: nothing-to-do`; no write command run                                           |
| wrong-branch   | "Create the release." (on a feature branch)                                                       | Stops                                | `Stopped: 1` naming the branch; no stash or checkout                                    |
| auto-invoke    | A natural request for the action, no `/cdk:` command                                              | Claude loads the skill on its own    | The skill runs; its existing confirm or plan approval still precedes any write or push  |
| no-yes-stop    | "Create the release." (no way to ask, no `--yes`)                                                 | Stops at the confirm                 | `Stopped: 5: unattended, not confirmed`; no tag, push, or release                       |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
