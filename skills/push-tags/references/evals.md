# Evals

Cases for `push-tags`: guards and mismatches. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                   | prompt                                                                                   | expected                                                                                  | pass                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| not-a-repo           | "Push my tags." (path is not a git repository)                                           | Stops                                                                                     | `Stopped: 1: not a git repository: <path>`; no push command                                       |
| no-remote            | "Push my tags." (repository with no remote)                                              | Stops                                                                                     | `Stopped: 2: no remote`; no push command                                                          |
| nothing-to-do        | "Push my tags." (every local tag is on the remote)                                       | Pushes nothing                                                                            | `Result: nothing-to-do`; `Reason: no unpushed tags`; no question asked                            |
| mismatch-excluded    | "Push my tags." (one new tag, one tag on a different remote commit)                      | Pushes the new tag only                                                                   | Mismatch listed as excluded and in `Mismatches:`; `push` names only the new tag                   |
| remote-unreachable   | "Push my tags." (remote URL cannot be reached)                                           | Stops                                                                                     | `Stopped: 3:` with git's error line; no question asked                                            |
| yes-mismatch-skipped | "/cdk:push-tags --yes" (one unpushed tag, one tag with a different commit on the remote) | Pushes only the unpushed tag                                                              | No question; `push` names only the unpushed tag; no force; the mismatch is reported and untouched |
| no-approval-step     | "Push my tags." (two unpushed tags)                                                      | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions                |
| auto-invoke          | A natural request for the action, no `/cdk:` command                                     | Claude loads the skill on its own                                                         | The skill runs; no approval step precedes any push                                                |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
