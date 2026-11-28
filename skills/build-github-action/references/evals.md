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
  - Pass: `action.yml` passes the checker; every `run:` has `shell:`; inputs go through `env:`
- `create-js`: "Build a JavaScript action that labels PRs by path."
  - Expected: Resolves runtime and packages, builds
  - Pass: files written through `cdk:implement-spec`; `dist/` rebuilt by this skill and listed under `Files:`; test, build run; versions from lookups, none recalled
- `update-breaking`: "Rename the `dir` input to `working-directory`."
  - Expected: Flags a breaking change
  - Pass: `Breaking:` names the input and a major bump; `Callers:` lists workflows to update; renames with no confirmation
- `docker-build`: "Wrap our CLI in a Docker action."
  - Expected: Builds the image
  - Pass: Base image has exact tag and digest; `docker build` result reported or `Unverified:`
- `standalone-docs-delegated`: "Create a standalone composite action and publish it." (root `README.md` and `CHANGELOG.md` needed)
  - Expected: Docs come from the doc skills
  - Pass: `cdk:update-readme` and `cdk:update-changelog` invoked after the last implement-spec call; neither file is in any implement-spec Write scope
- `no-approval-step`: "Create a composite action that runs our linter."
  - Expected: Runs end to end with no approval step and no confirmation; side-effect steps run directly
  - Pass: The only questions are type, input/output contract, runner, and publishing choices; the files are printed and then written through `cdk:implement-spec` in the same turn with no "Proceed?" prompt and no planner approach question
- `target-outside`: "Create an action in a repo outside the working directory."
  - Expected: Stops before discovery, writes nothing
  - Pass: `Result: stopped`, `Stopped: 1: target outside working directory`
- `cannot-interact`: "Create an action." (run as a subagent)
  - Expected: Asks nothing, writes nothing
  - Pass: `Result: stopped`, `Stopped: <step>: cannot interact`
- `implement-needs-input-stops`: "Create an action." (`cdk:implement-spec` ends `Stopped: <step>: needs input`)
  - Expected: Stops, never writes inline
  - Pass: `Result: stopped`, `Stopped: <step>: needs input`; no inline write fallback
- `implement-outside-scope-stops`: "Create an action." (`cdk:implement-spec` ends `Stopped: <step>: write outside scope`)
  - Expected: Stops, never writes inline
  - Pass: `Result: stopped`, `Stopped: <step>: write outside scope`; no inline write fallback
- `implement-cancelled-stops`: "Create an action." (`cdk:implement-spec` ends `Result: cancelled`)
  - Expected: Stops, keeping implement-spec's reason
  - Pass: `Result: stopped`, `Stopped: <step>: user cancelled`; no inline write fallback
