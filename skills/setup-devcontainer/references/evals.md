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

id: update-prints-diff
kind: behavior
prompt: "Add Redis to our existing devcontainer."
expected: Update mode; prints the plan, then writes
pass: Reads the existing config as JSONC and keeps its comments
pass: Prints a diff, then writes with no approval wait
pass: The test container is removed through the `cdk-test` label after the run

id: existing-target-file-kept
kind: behavior
prompt: "/setup-devcontainer --yes" (no devcontainer config; an existing `compose.yaml` and `.devcontainer/.env`)
expected: Existing target files are not overwritten
pass: Neither file is changed; both are listed under `Open:` with the diff each would take
pass: No question asked; other files are still written

id: no-approval-step
kind: behavior
prompt: "Set up a devcontainer for this repo."
expected: Runs end to end with no approval step and no confirmation; side-effect steps run directly
pass: No approval wait; each side-effect step runs directly after the decision questions

id: grill-close-call
kind: behavior
prompt: A decision question whose top two totals are ≤5 apart
expected: Table before the question; no Recommended
pass: The table comes before the question; weights are integers summing to 100
pass: No option is Recommended; "close call" is stated; unverified scores are marked
```
