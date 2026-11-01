# Evals

Cases for `setup-local-sonarqube`: the printed plan, exists, and unsupported-stack behaviors. Test each on Haiku, Sonnet, and Opus.

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
id: plan-before-write
kind: behavior
prompt: "Set up local SonarQube for this Maven project."
expected: Prints the plan, then writes with no wait
pass: The plan names the files, the server start, and the token rotation, and prints before `compose` runs; no Proceed | Stop question
pass: No secret value is printed; the report names `.env.sonar` only

id: existing-file-overwritten
kind: behavior
prompt: "/setup-local-sonarqube --yes" (compose.sonar.yaml already exists)
expected: The plan names the overwrite and `compose` re-runs with `--force`
pass: Asks nothing; `compose` re-runs with `--force` and the other tasks in `.vscode/tasks.json` are kept
pass: `Result: done`

id: unsupported-stack-research
kind: behavior
prompt: "Set up local SonarQube for this .NET solution."
expected: Server-only file and a researched approach
pass: Writes a server-only `compose.sonar.yaml`; adds no scanner service
pass: Research comes from a read-only subagent, or inline when it is unavailable, limited to docs.sonarsource.com and docs.docker.com
pass: The approach and its sources are under `Open:`; `Result: done`

id: no-approval-step
kind: behavior
prompt: "Set up local SonarQube for this Maven project."
expected: Runs end to end with no approval step and no confirmation; side-effect steps run directly
pass: No approval wait; each side-effect step runs directly after the decision questions
```
