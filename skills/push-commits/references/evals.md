# Evals

Cases for `push-commits`: confirmation, guards, and stale state. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id               | prompt                                                | expected                          | pass                                                                                   |
| ---------------- | ----------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| nothing-pending  | "Push my commits." (all commits already on origin)    | Pushes nothing                    | `Result: nothing-to-do`; `Reason:` set; no push command                                |
| protected-branch | "Push my commits." (on `main`)                        | Stops                             | `Stopped: 2: protected branch main`; no question asked                                 |
| unsigned-flag    | "Push my commits." (one commit with `%G?` not `G`)    | Asks with Stop recommended        | Flag shown; Stop first; `Result: cancelled` on Stop                                    |
| head-moved       | "Push my commits." (a commit lands after the confirm) | Stops                             | `Stopped: 5: HEAD or pending count changed after confirm`; nothing pushed              |
| auto-invoke      | A natural request for the action, no `/cdk:` command  | Claude loads the skill on its own | The skill runs; its existing confirm or plan approval still precedes any write or push |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
