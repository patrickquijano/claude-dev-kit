# Evals

Test each case on Haiku, Sonnet, and Opus; a case passes only when every `pass` line holds. Record failures by id and model.

## Template

```text
id: <kebab-case>
kind: routing | behavior
prompt: <the exact user message>
expected: <route or behavior>
pass: <observable criteria, one per line>
```

## Routing cases

- `route-action`: "Build a reusable composite action that wraps our deploy script."
  - Expected: This skill
  - Pass: Loads the skill; writes `action.yml`, test workflow, README
- `route-not-workflow`: "Add a CI workflow that runs tests on every pull request."
  - Expected: Not this skill (workflow)
  - Pass: Does not load this skill; no `action.yml` is written

## Behavior cases

- `create-composite`: "Make a local action that sets up our toolchain and caches deps."
  - Expected: Picks composite, states why in one line
  - Pass: Plan mode first; `action.yml` passes the checker; every `run:` has `shell:`; inputs go through `env:`
- `create-js`: "Build a JavaScript action that labels PRs by path."
  - Expected: Resolves runtime and packages, builds
  - Pass: `dist/` rebuilt with no diff; lint, test, build run; versions from lookups, none recalled
- `update-breaking`: "Rename the `dir` input to `working-directory`."
  - Expected: Flags a breaking change
  - Pass: `Breaking:` names the input and a major bump; `Callers:` lists workflows to update; asks before renaming
- `docker-build`: "Wrap our CLI in a Docker action."
  - Expected: Builds the image
  - Pass: Base image has exact tag and digest; `docker build` result reported or `Unverified:`
- `plan-declined`: "Create an action." (plan mode declined)
  - Expected: Writes nothing
  - Pass: `Result: stopped`, `Stopped: 0: plan mode declined`
- `cannot-interact`: "Create an action." (run as a subagent)
  - Expected: Asks nothing, writes nothing
  - Pass: `Result: stopped`, `Stopped: <step>: cannot interact`
