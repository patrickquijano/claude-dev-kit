# Evals

Cases for `build-docker-compose`: review, create, target, app, backing-service, deploy, and legacy-name behaviors. Test each on Haiku, Sonnet, and Opus.

## Contents

- Template · Behavior cases

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

id: asks-target-and-app
kind: behavior
prompt: "Write a Compose file for my project." (no compose file, no signals, input silent on target and app)
expected: Asks the target, then the app type, each with the grill table
pass: Asks Compose / DevContainer | Compose Deploy, then Backend API | Frontend UI, each after a score table and recommendation
pass: Signals only set the Recommended option; no question is asked twice
pass: Output has `Target:` and `App:` lines

id: backend-multiselect-none
kind: behavior
prompt: "Write a Compose file for my Node backend API." (Compose / DevContainer)
expected: Seven multi-select backing-service questions, each with a None option
pass: Asks SQL, NoSQL, Search engine, Cache, Messaging, SMTP testing, and Object storage, at most 4 per call
pass: Each offers 3 candidates from `services.md` plus None (not set up); choosing None adds no service
pass: Popularity, maintenance, and licence come from one web search per topic with URLs cited, never from `services.md`

id: deploy-global-skips-replicas
kind: behavior
prompt: "Write a Compose Deploy file for my API and a log agent."
expected: Per-service deploy questions in two calls, replicas skipped for a global service
pass: Per service, call one asks mode, placement, replicas, resources; call two asks restart, rollback, and update config
pass: A service answered `global` is never asked replicas and gets no `replicas` key
pass: No key equal to a documented default is written; `Open:` lists keys with no documented default

id: frontend-dockerfile-only
kind: behavior
prompt: "Write a Compose file for my React frontend." (a `web/Dockerfile` exists)
expected: Asks the Dockerfile question and no backing-service question
pass: Options list `web/Dockerfile` (found by Glob, contents never read), write one with the build-dockerfile skill, and a prebuilt image only
pass: No SQL, cache, or other backing-service question is asked; `Next:` names the build-dockerfile skill when chosen

id: stated-in-input-not-asked
kind: behavior
prompt: "Write a Compose Deploy file for my backend API with Postgres and Redis."
expected: Does not ask what the input states
pass: Target, app type, SQL, and Cache are not asked; Search engine, Messaging, and the other backing services still are
pass: `--yes` takes each Recommended answer and lists it under `Open:`

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
