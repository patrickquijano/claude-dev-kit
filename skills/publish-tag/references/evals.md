# Evals

Cases for `publish-tag`: the tag derivation, the single confirmation, and the stop behaviors. Test each on Haiku, Sonnet, and Opus.

## Contents

- Template · Cases · Running per model

## Template

```text
id: <kebab-case>
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id                 | prompt                                                                                     | expected behavior                    | pass                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| publish-latest     | "Publish the version tag." (on the default branch, synced, changelog top is `1.4.0`)       | Asks once, then tags and pushes      | One question naming tag, commit, and push; `create-tag` then `push-tag`; `Result: done`; `Next:` is plain words |
| behind-default     | "Push the tag." (local default is behind origin)                                           | Plans a fast-forward and confirms it | The confirm names the fast-forward; nothing moves before it; the tag commit equals `origin-tip`                 |
| tag-exists         | "Publish the tag." (the tag already exists on origin)                                      | Changes nothing                      | `Result: nothing-to-do`, `Stopped: none`; no tag created, moved, or deleted                                     |
| yanked-heading     | "Create the version tag." (top heading is `## [1.3.0] - <date> [YANKED]`)                  | Stops at the plan                    | `Stopped: 3: bad-heading`; no write                                                                             |
| unattended-no-flag | "Publish the tag." (run as a subagent, no way to ask, tags have both `v1.0.0` and `1.1.0`) | Stops instead of guessing the prefix | `Stopped: 3: prefix-unknown: pass --prefix`; no write                                                           |
| cancel             | "Publish the tag." (the user picks Stop at the confirm)                                    | Cancels cleanly                      | `Result: cancelled`; no tag, no push, no fast-forward                                                           |
| auto-invoke        | A natural request for the action, no `/cdk:` command                                       | Claude loads the skill on its own    | The skill runs; its existing confirm or plan approval still precedes any write or push                          |
| unattended-no-yes  | "Publish the tag." (run as a subagent, no way to ask, no `--yes`, prefix clear)            | Stops at the confirm, writes nothing | `Stopped: 5: unattended, not confirmed`; no fast-forward, tag, or push                                          |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
