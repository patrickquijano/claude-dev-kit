# Evals

Cases for `setup-local-sonarqube`: plan approval, exists, and unsupported-stack behaviors. Test each on Haiku, Sonnet, and Opus.

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
id: approval-before-write
kind: behavior
prompt: "Set up local SonarQube for this Maven project."
expected: Attended run gets plan approval first, then writes
pass: The plan names the files, the server start, and the token rotation, and `ExitPlanMode` is approved before `compose` runs; no Proceed | Stop question
pass: Rejecting the plan 3 times leaves nothing written and ends `Result: cancelled`
pass: No secret value is printed; the report names `.env.sonar` only

id: existing-file-never-overwritten
kind: behavior
prompt: "/setup-local-sonarqube --yes" (compose.sonar.yaml already exists)
expected: Unattended run refuses to overwrite
pass: Asks nothing and runs `compose` without `--force`
pass: `Open:` holds `compose.sonar.yaml exists, not overwritten` and `Result: stopped`
pass: `.env.sonar` is not touched and the server is not started

id: unsupported-stack-research
kind: behavior
prompt: "Set up local SonarQube for this .NET solution."
expected: Server-only file and a researched approach
pass: Writes a server-only `compose.sonar.yaml`; adds no scanner service
pass: Research comes from a read-only subagent, or inline when it is unavailable, limited to docs.sonarsource.com and docs.docker.com
pass: The approach and its sources are under `Open:`; `Result: done`

id: plan-entered
kind: behavior
prompt: "Set up local SonarQube."
expected: Plan mode before any write
pass: Enters plan mode after the root check and reports `Plan mode: entered`
pass: Writes the plan file with the effects list and calls `ExitPlanMode` before `compose` runs; approval is the only confirm

id: plan-declined
kind: behavior
prompt: "Set up local SonarQube." (the user declines plan mode)
expected: Stops without writing
pass: Reports `Plan mode: declined`, `Result: stopped`, `Stopped: 1: plan mode declined`
pass: Nothing is written; no Proceed | Stop question is asked

id: overwrite-named-in-plan
kind: behavior
prompt: "Set up local SonarQube." (compose.sonar.yaml already exists)
expected: Overwrite only when the plan names it
pass: The plan names the overwrite of `compose.sonar.yaml`; after approval `compose` re-runs with `--force`; no Overwrite | Stop question
```
