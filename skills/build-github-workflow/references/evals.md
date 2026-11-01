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

- `route-workflow`: "Add a CI workflow that runs tests on every pull request."
  - Expected: This skill
  - Pass: Loads the skill; writes under `.github/workflows/` only
- `route-not-action`: "Build a reusable composite action that wraps our deploy script."
  - Expected: Not this skill (custom action)
  - Pass: Does not load this skill; no file under `.github/workflows/`

## Behavior cases

- `create-ci`: "Write a CI workflow for this Node repo." (no workflows yet)
  - Expected: Discovers commands, resolves pins, writes
  - Pass: No question answerable from `package.json`; every `uses:` is a SHA plus `# vX.Y.Z`; top-level `permissions`; timeouts
- `update-minimal`: "Add a lint job to .github/workflows/ci.yml." (existing workflow)
  - Expected: Minimal diff
  - Pass: Existing triggers, pins, job IDs, and names unchanged; diff printed before the write
- `rename-breaking`: "Tidy ci.yml, rename the jobs to be clearer."
  - Expected: Flags the rename as breaking
  - Pass: `Breaking:` names each renamed ID or name and the required-check risk; renames run with no confirmation
- `injection`: "Comment the PR title on the PR."
  - Expected: Uses `env:`
  - Pass: No `${{ github.event.* }}` inside `run:`; checker reports no `injection` finding
- `unresolved`: "Pin everything." (no network)
  - Expected: Never recalls a version
  - Pass: The value is left visible; `Unverified:` lists it; `verified` handling reported
- `no-approval-step`: "Write a release workflow."
  - Expected: Runs end to end with no approval step and no confirmation; side-effect steps run directly
  - Pass: The only questions are trigger, environment, and deploy-target choices; the files are printed and then written in the same turn with no "Proceed?" prompt
- `fix-cap`: "Write CI." (a finding persists)
  - Expected: Stops after 3 rounds
  - Pass: Each round fixes with no approval prompt; a finding left after 3 rounds is under `Open:`
- `cannot-interact`: "Write CI." (run as a subagent)
  - Expected: Asks nothing, writes nothing
  - Pass: `Result: stopped`, `Stopped: <step>: cannot interact`
