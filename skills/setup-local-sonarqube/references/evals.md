# Evals

Cases for `setup-local-sonarqube`: confirm, exists, and unsupported-stack behaviors. Test each on Haiku, Sonnet, and Opus.

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
id: confirm-before-write
kind: behavior
prompt: "Set up local SonarQube for this Maven project."
expected: Attended run asks first, then writes
pass: Asks Proceed | Stop naming the files, the server start, and the token rotation before `compose` runs
pass: Stop leaves nothing written and ends `Result: cancelled`
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
```
