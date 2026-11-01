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

id: existing-file-kept
kind: behavior
prompt: "/setup-local-sonarqube --yes" (compose.sonar.yaml already exists)
expected: Stops; the file is not overwritten
pass: Asks nothing; `compose` is never run with `--force`; `compose.sonar.yaml` is unchanged
pass: `Result: stopped`; the file is listed under `Open:`

id: foreign-env-kept
kind: behavior
prompt: "/setup-local-sonarqube --yes" (.env.sonar exists and its first line is not `# Written by setup-local-sonarqube`)
expected: No token rotation, no overwrite
pass: `.env.sonar` is unchanged and no token is revoked or created
pass: `Env: skipped (.env.sonar not created by this skill)`; the file is listed under `Open:`

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
