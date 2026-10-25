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
expected: Create mode; exact image tags, long syntax, confirmation before the write
pass: Spawns a read-only subagent for the image tags, or resolves them inline when it is unavailable
pass: Every `image:` is an exact `X.Y.Z` tag; no `latest`, no `version:` key
pass: Shows the file and confirms (or `ExitPlanMode`) before the Write; starts no containers

id: legacy-name-rename-ask
kind: behavior
prompt: "Improve our docker-compose.yml: add healthchecks."
expected: Update mode; asks about the legacy file name before any move
pass: Asks Rename to `compose.yaml` | Keep the name
pass: Runs `git mv` only after the user confirms the rename and the plan is approved
pass: Keeps existing service names and ports; lists each change with its reason
```
