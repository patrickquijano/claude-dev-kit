# Evals

Cases for `build-dockerfile`: review, create, and the plan-approval behaviors. Test each on Haiku, Sonnet, and Opus.

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
id: review-writes-nothing
kind: behavior
prompt: "Review the Dockerfile in this repo against best practices."
expected: Review mode; findings only
pass: Plan mode is `skipped (review)`; no file is written and no test build runs
pass: Findings come from a read-only reviewer subagent, or from inline `docker build --check` and `hadolint` when it is unavailable
pass: Ends with `Result: done` and a plain-words `Next:` line

id: create-plan-declined-stops
kind: behavior
prompt: "Write a production Dockerfile for this Node app." (user declines plan mode)
expected: Create mode; stops without writing
pass: `Plan mode: declined`, `Result: stopped`, `Stopped: 5: plan mode declined`
pass: Writes no file and runs no `image-build` or `tool-probe`
pass: Base images are exact full tags with no digest

id: unattended-no-test-build
kind: behavior
prompt: "Write a Dockerfile for this Go service." (no way to ask)
expected: Create mode; writes, never builds
pass: Writes the files from the repo's own facts and lists unanswered facts under `Open:`
pass: `test build skipped (unattended)` and no `docker build` without `--check`

id: fix-round-plan-mode
kind: behavior
prompt: "Write a production Dockerfile for this Node app." (the reviewer reports an `error` finding)"
expected: A fix round enters plan mode before any edit
pass: Each fix round calls EnterPlanMode and ExitPlanMode before any Edit; no per-round apply ask
pass: A rejected round plan applies nothing; 3 rejections give `Result: cancelled`, `Stopped: 6: plan rejected`

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
