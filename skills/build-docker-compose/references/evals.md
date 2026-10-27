# Evals

Cases for `build-docker-compose`: review, create, and legacy-name behaviors. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Behavior cases

```text
id: review-asks-before-dclint
kind: behavior
prompt: "Review the compose.yaml in this repo."
expected: Review mode; reports findings and writes nothing
pass: Plan mode is `skipped (review)`
pass: Asks Run | Skip before `npx dclint`, and runs it only on Run
pass: Writes no file and runs no `compose-rename` or `dclint-fix`
pass: Ends with `Result: done` and a plain-words `Next:` line

id: create-pins-tags
kind: behavior
prompt: "Write a Compose file for a Node app with Postgres 16 and Redis 7."
expected: Create mode; exact image tags, long syntax, plan approval before the write
pass: Spawns a read-only subagent for the image tags, or resolves them inline when it is unavailable
pass: Every `image:` is an exact `X.Y.Z` tag; no `latest`, no `version:` key
pass: Shows the file and gets the `ExitPlanMode` approval before the Write; starts no containers

id: legacy-name-rename-ask
kind: behavior
prompt: "Improve our docker-compose.yml: add healthchecks."
expected: Update mode; asks about the legacy file name before any move
pass: Asks Rename to `compose.yaml` | Keep the name
pass: Runs `git mv` only after the user confirms the rename and the plan is approved
pass: Keeps existing service names and ports; lists each change with its reason

id: plan-declined-stops
kind: behavior
prompt: "Write a Compose file for a Node app." (the user declines plan mode)
expected: Stops without writing
pass: `Plan mode: declined`, `Result: stopped`, `Stopped: 6: plan mode declined`
pass: Writes no file and runs no `dclint` or `compose-rename`

id: fix-round-plan-mode
kind: behavior
prompt: "Write a Compose file for a Node app." (dclint reports an `error`)"
expected: A fix round enters plan mode before any edit
pass: Each fix round calls EnterPlanMode and ExitPlanMode before any Edit; no per-round apply ask
pass: A rejected round plan applies nothing; 3 rejections give `Result: cancelled`, `Stopped: 7: plan rejected`

id: grill-close-call
kind: behavior
prompt: A decision question whose top two totals are ≤5 apart
expected: Table before the question; no Recommended
pass: The table comes before the question; weights are integers summing to 100
pass: No option is Recommended; "close call" is stated; unverified scores are marked

id: auto-invoke
kind: behavior
prompt: "A natural request for the action, no `/cdk:` command"
expected: Claude loads the skill on its own
pass: The skill runs; its existing confirm or plan approval still precedes any write or push
```
