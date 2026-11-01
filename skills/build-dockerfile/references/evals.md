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
pass: Prints the files, then writes them with no wait

id: unattended-lists-assumptions
kind: behavior
prompt: "--yes Write a Dockerfile for this Go service."
expected: Create mode; no questions, assumptions listed
pass: Writes the files from the repo's own facts and lists unanswered facts under `Open:`
pass: Runs the test build with `image-build`, never a `docker build` without a throwaway tag

id: no-approval-step
kind: behavior
prompt: "Write a production Dockerfile for this Node app."
expected: Runs end to end with no approval step and no confirmation; side-effect steps run directly
pass: No approval wait; each side-effect step runs directly after the decision questions

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
pass: The skill runs and carries out its steps with no approval step
```
