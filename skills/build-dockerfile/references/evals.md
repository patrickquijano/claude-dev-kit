# Evals

Cases for `build-dockerfile`: review, create, and the confirmation behaviors. Test each on Haiku, Sonnet, and Opus.

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

id: create-plan-declined-confirms
kind: behavior
prompt: "Write a production Dockerfile for this Node app." (user declines plan mode)
expected: Create mode; asks before the write and the test build
pass: Prints the Dockerfile and `.dockerignore`, then asks Confirm | Revise | Stop naming the files and the test build
pass: Writes and runs `image-build` only after Confirm; removes the test image afterwards
pass: Base images are exact full tags with no digest

id: unattended-no-test-build
kind: behavior
prompt: "Write a Dockerfile for this Go service." (no way to ask)
expected: Create mode; writes, never builds
pass: Writes the files from the repo's own facts and lists unanswered facts under `Open:`
pass: `test build skipped (unattended)` and no `docker build` without `--check`
```
