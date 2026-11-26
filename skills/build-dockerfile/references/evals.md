# Evals

Cases for `build-dockerfile`: review, create, and unattended behaviors. Test each on Haiku, Sonnet, and Opus.

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
pass: No file is written and no test build runs
pass: Findings come from a read-only reviewer subagent, or from inline `docker build --check` and `hadolint` when it is unavailable
pass: Ends with `Result: done` and a plain-words `Next:` line

id: create-pins-tags
kind: behavior
prompt: "Write a production Dockerfile for this Node app."
expected: Create mode; writes the files with exact base-image tags
pass: Base images are exact full tags with no digest
pass: Prints the files, then writes them through `cdk:implement-spec` with no wait

id: unattended-lists-assumptions
kind: behavior
prompt: "--yes Write a Dockerfile for this Go service."
expected: Create mode; no questions, assumptions listed
pass: Writes the files from the repo's own facts and lists unanswered facts under `Open:`
pass: Runs only `build-check` and `hadolint-lint` (when installed); the test build is `skipped (not asked)` and no `RUN` line executes

id: yes-asked-test-build
kind: behavior
prompt: "--yes Write a Dockerfile for this Go service and build it to test."
expected: The input asks for a build, so the test build runs
pass: Runs `image-build` to a `cdk-build-test:<run id>` tag, then `image-inspect` and `image-remove`
pass: Without an explicit ask for a build in the input the same `--yes` run never calls `image-build`

id: no-approval-step
kind: behavior
prompt: "Write a production Dockerfile for this Node app."
expected: Runs end to end with no approval step and no confirmation; side-effect steps run directly
pass: The only questions are missing-fact questions (runtime version, commands, port); the files are printed and then written through `cdk:implement-spec` in the same turn with no "Proceed?" prompt and no approach question

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
pass: The skill runs; the files are printed and written with no approval question

id: no-trigger-compose
kind: behavior
prompt: "Write a compose.yaml that runs this app with Postgres."
expected: build-dockerfile does not load
pass: No Dockerfile or .dockerignore is written and no build-dockerfile Output block prints

id: implement-needs-input-stops
kind: behavior
prompt: "Write a production Dockerfile for this Node app." (`cdk:implement-spec` ends `Stopped: <step>: needs input`)
expected: Stops, never writes inline
pass: `Result: stopped`, `Stopped: <step>: needs input`; no inline write fallback

id: implement-outside-scope-stops
kind: behavior
prompt: "Write a production Dockerfile for this Node app." (`cdk:implement-spec` ends `Stopped: <step>: write outside scope`)
expected: Stops, never writes inline
pass: `Result: stopped`, `Stopped: <step>: write outside scope`; no inline write fallback

id: implement-cancelled-stops
kind: behavior
prompt: "Write a production Dockerfile for this Node app." (`cdk:implement-spec` ends `Result: cancelled`)
expected: Stops, keeping implement-spec's reason
pass: `Result: stopped`, `Stopped: <step>: user cancelled`; no inline write fallback

id: cannot-interact-stops
kind: behavior
prompt: "Write a production Dockerfile for this Node app." (no one to reply, no `--yes`)
expected: Stops at the first question and writes nothing
pass: `Result: stopped`, `Stopped: <step>: cannot interact`; no file written

```
