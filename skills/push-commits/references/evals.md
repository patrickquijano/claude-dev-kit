# Evals

Cases for `push-commits`: guards and pending state. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id | prompt | expected | pass |
| --- | --- | --- | --- |
| nothing-pending | "Push my commits." (all commits already on origin) | Pushes nothing | `Result: nothing-to-do`; `Reason:` set; no push command |
| protected-branch | "Push my commits." (on `main`) | Stops | `Stopped: 2: protected branch main`; no question asked |
| unsigned-commit | "Push my commits." (one commit with `%G?` not `G`) | Stops before any push | `Stopped: 4: unsigned commit <hash>`; no push command; no question asked |
| fixup-note | "Push my commits." (signed, one `WIP` subject) | Notes it and pushes | `WIP` noted in the summary; `push` runs once; no question asked |
| no-approval-step | "Push my commits." (two pending signed commits) | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions |
| auto-invoke | A natural request for the action, no `/cdk:` command | Claude loads the skill on its own | The skill runs; no approval step precedes any write or push |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
