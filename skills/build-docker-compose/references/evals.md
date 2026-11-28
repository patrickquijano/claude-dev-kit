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
id: review-runs-dclint
kind: behavior
prompt: "Review the compose.yaml in this repo."
expected: Review mode; reports findings and writes nothing
pass: Runs `npx --yes dclint@<version>` with `<version>` from `npm view dclint version`, never bare `npx dclint`, with no ask before it
pass: Writes no file and runs no `compose-rename`
pass: Ends with `Result: done` and a plain-words `Next:` line

id: create-pins-tags
kind: behavior
prompt: "Write a Compose file for a Node app with Postgres 16 and Redis 7."
expected: Create mode; exact image tags, long syntax, file printed then written with no wait
pass: Spawns a read-only subagent for the image tags, or resolves them inline when it is unavailable
pass: Every `image:` is the most specific tag per `practices.md` `## Image tags` (`X.Y.Z`, or the highest `X.Y` for an image such as `postgres` that publishes no `X.Y.Z` tag); no `latest`, no `version:` key
pass: Prints the file, then writes it through `cdk:implement-spec` with no approval wait; starts no containers

id: legacy-name-rename-ask
kind: behavior
prompt: "Improve our docker-compose.yml: add healthchecks."
expected: Update mode; asks about the legacy file name before any move
pass: Asks Rename to `compose.yaml` | Keep the name
pass: Runs `git mv` only when the user chose Rename, right after the answer
pass: Keeps existing service names and ports; lists each change with its reason

id: no-approval-step
kind: behavior
prompt: "Write a Compose file for a Node app."
expected: Runs end to end with no approval step and no confirmation; side-effect steps run directly
pass: The only questions are decision questions for unstated choices (target, app type, Dockerfile, ports, volumes); the file is printed and then written through `cdk:implement-spec` in the same turn with no "Proceed?" prompt and no approach question

id: independent-review
kind: behavior
prompt: "Write a Compose file for a Node app."
expected: Step 7 reviews the written file with a fresh `cdk:practices-reviewer` subagent; review mode reviews the existing file
pass: Spawns `cdk:practices-reviewer` with `kind: compose` (fallback: a read-only subagent, Read and Grep only) that gets only the file path (the written file; in review mode the existing file), the target, and `practices.md`, never the draft or the conversation
pass: The skill confirms each returned `path:line item` with Read and lists leftovers under `Open:`
pass: When no subagent is available, checks the file inline; no approval question is asked

id: asks-target-and-app
kind: behavior
prompt: "Write a Compose file for my project." (no compose file, no signals, input silent on target and app)
expected: Asks the target, then the app type, each with the grill table
pass: Asks Compose / DevContainer | Compose Deploy, then Backend API | Frontend UI, each after a grill table and the Recommended option
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
pass: Options list `web/Dockerfile` (found by Glob, contents never read), and write one with the build-dockerfile skill; a prebuilt image only is reachable through Other
pass: No SQL, cache, or other backing-service question is asked; `Next:` names the build-dockerfile skill when chosen

id: stated-in-input-not-asked
kind: behavior
prompt: "Write a Compose Deploy file for my backend API with Postgres and Redis."
expected: Does not ask what the input states
pass: Target, app type, SQL, and Cache are not asked; Search engine, Messaging, and the other backing services still are

id: backing-service-healthcheck-depends-on
kind: behavior
prompt: "Write a Compose file for my Node backend API with Postgres."
expected: The backing service has a healthcheck and the app waits for it
pass: The Postgres service carries a `healthcheck` whose `test` comes from its official docs page fetched at run time
pass: The app's `depends_on` entry for Postgres has `condition: service_healthy`
pass: Credentials come via `secrets` or `${VAR:?err}`, never inline; no data-store port is published unless asked

id: review-mode-asks-nothing
kind: behavior
prompt: "Review the compose.yaml in this repo." (input silent on target and app)
expected: Review mode asks no Target or App question
pass: No Target or App question is asked
pass: Output shows `Target: Compose / DevContainer (assumed: <reason>)` with no clear signal, noted under `Open:`; never `Target: unset`
pass: Output shows `App:` as a signal-based value or `unset (<reason>)`, with the gap under `Open:`

id: compose-no-deploy-keys
kind: behavior
prompt: "Write a Compose / DevContainer file for my API with resource limits."
expected: Compose / DevContainer files carry no deploy placement or update keys
pass: No `placement`, `update_config`, or `rollback_config` key is written
pass: No per-service deploy question is asked

id: yes-ports-secrets-least-exposed
kind: behavior
prompt: "--yes Write a Compose file for my Node service."
expected: Unattended run takes the least exposed answers
pass: Backing services answer `None`, so no backing service is added; the Recommended answers are listed under `Open:`
pass: No data-store port is published and secrets are used over env vars
pass: An undetectable app type stays `App: unset (<reason>)`

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
pass: The skill runs; the file is printed and written with no approval question

id: dockerfile-request-no-trigger
kind: behavior
prompt: "Write a Dockerfile for my Node app."
expected: build-docker-compose does not load
pass: No compose file is written and no Compose question is asked

id: implement-needs-input-stops
kind: behavior
prompt: "Write a Compose file for a Node app." (`cdk:implement-spec` ends `Stopped: <step>: needs input`)
expected: Stops, never writes inline
pass: `Result: stopped`, `Stopped: <step>: needs input`; no inline write fallback

id: implement-outside-scope-stops
kind: behavior
prompt: "Write a Compose file for a Node app." (`cdk:implement-spec` ends `Stopped: <step>: write outside scope`)
expected: Stops, never writes inline
pass: `Result: stopped`, `Stopped: <step>: write outside scope`; no inline write fallback

id: implement-cancelled-stops
kind: behavior
prompt: "Write a Compose file for a Node app." (`cdk:implement-spec` ends `Result: cancelled`)
expected: Stops, keeping implement-spec's reason
pass: `Result: stopped`, `Stopped: <step>: user cancelled`; no inline write fallback

id: cannot-interact-stops
kind: behavior
prompt: "Write a Compose file for this Node app and Postgres." (no one to reply, no `--yes`)
expected: Stops at the first question and writes nothing
pass: `Result: stopped`, `Stopped: <step>: cannot interact`; no file written

id: yes-unresolved-image-unset
kind: behavior
prompt: "--yes Write a Compose file for my app with a `mcr.microsoft.com/mssql/server` database." (non-Docker-Hub registry, tag cannot be resolved)
expected: Asks nothing, leaves the image unset
pass: No question asked; no tag written from memory; the image is left unset in the file and listed under `Open:`

```
