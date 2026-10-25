# Evals

Cases for `setup-devcontainer`: create, update, and Dockerfile-handoff behaviors. Test each on Haiku, Sonnet, and Opus.

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
id: create-image-approach
kind: behavior
prompt: "Set up a devcontainer for this Python project."
expected: Create mode; image approach with a picked tag
pass: The analyzer runs as a read-only subagent, or inline when it is unavailable
pass: The base tag comes from `pick-tag` (or the WebFetch fallback), never from memory
pass: Writes `.devcontainer/devcontainer.json` with `workspaceFolder`; no credentials in any file

id: firewall-needs-dockerfile
kind: behavior
prompt: "Set up a devcontainer with Claude Code and the firewall."
expected: Dockerfile handoff, not a Dockerfile
pass: Writes no Dockerfile
pass: `Next:` holds one line "write a Dockerfile with these arguments: ..." with the `target=devcontainer` keys
pass: The test reports `up + exec test: skipped (no Dockerfile)` and cleans up nothing

id: update-writes-after-approval
kind: behavior
prompt: "Add Redis to our existing devcontainer." (plan mode entered)
expected: Update mode; plan, then write after approval
pass: Reads the existing config as JSONC and keeps its comments
pass: Prints a diff and writes only after `ExitPlanMode` approval
pass: The test container is removed through the `cdk-test` label after the run

id: plan-entered
kind: behavior
prompt: "Set up a devcontainer for this repo."
expected: Plan mode before any write
pass: Enters plan mode after pre-flight and reports `Plan mode: entered`
pass: Writes the plan file and calls `ExitPlanMode` before the first write
pass: The test question is asked before `ExitPlanMode`; no separate Write | Stop ask

id: plan-declined
kind: behavior
prompt: "Add Redis to our existing devcontainer." (the user declines plan mode)
expected: Stops without writing
pass: Reports `Plan mode: declined`, `Result: stopped`, `Stopped: 6: plan mode declined`
pass: No file is written
```
