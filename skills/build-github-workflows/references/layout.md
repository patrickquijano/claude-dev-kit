# Layout

Skeletons for the orchestrator and callee files. `<…>` is filled from the request, repo facts, and the resolver table; no value here is a real version. Rules and reasons: `practices.md`. Delete `#` comments from output.

## Contents

- Files · Orchestrator · Gate · Callee · Composite action

## Files

- `.github/workflows/<file>.yml`: orchestrator, one per trigger set; the file comes from the `practices.md` `## Naming` table (`ci.yml`, `release.yml`, `deploy.yml`, `scheduled.yml`, `manual.yml`).
- `.github/workflows/_<job-id>.yml`: one callee per job, named from the job id (for example `_lint.yml`, `_test-unit.yml`, `_build-image.yml`).
- Shared by several orchestrators → keep the one callee; never copy it. A job used once still gets its own file.
- `.github/actions/<name>/action.yml`: a composite action for steps that repeat (see `## Composite action`).
- Update mode adds callees beside the existing files.

## Orchestrator

```yaml
name: <Workflow name> # file stem in Title Case (CI, Release, Deploy, Scheduled, Manual)

on:
  <event>: # only the events the request names; filters (branches, paths, types) explicit
    branches: [<branch>]

permissions: {} # least privilege; each job grants what it needs

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: <${{ github.event_name == 'pull_request' }} for CI | false for deploy and release>

jobs:
  <job-id>:
    name: <Job Name> # Title Case of <job-id>; check-name format unverified, see practices Naming
    uses: ./.github/workflows/_<job-id>.yml
    needs: [<job-id>] # only real dependencies
    permissions:
      contents: read
    with:
      <input_name>: ${{ <expression> }}
    secrets:
      <SECRET_NAME>: ${{ secrets.<SECRET_NAME> }} # explicit; never inherit
```

- Caller job keys: per practices.md `## Reusable-workflow contract`.
- Callee outputs are read as `needs.<job-id>.outputs.<output_name>` and passed on through `with:`.
- Untrusted event data (titles, bodies, branch names) may be passed in `with:` only to a callee that reads it through step `env:` or an action input, never interpolated into a script; see practices `## Untrusted input and secrets`.

## Gate (only when a touched job has a required check)

Caller job in the orchestrator (indent under `jobs:`); it `needs` every other job and runs even when they fail:

```yaml
gate:
  name: Gate
  if: ${{ always() }}
  permissions: {}
  needs: [<every other job-id>]
  uses: ./.github/workflows/_gate.yml
  with:
    results: ${{ join(needs.*.result, ' ') }}
```

`_gate.yml` is a callee shaped like any other (`## Callee`): `workflow_call` input `results` (type `string`, `required: true`, `default: ''`), `defaults.run.shell: sh`, one job with `runs-on` (resolved label), `permissions: {}`, `timeout-minutes: 5`, no checkout or secrets, and one step:

```yaml
- name: Fail on failed or cancelled jobs
  env:
    RESULTS: ${{ inputs.results }}
  run: |
    set -eu
    printf '%s\n' "gate: results: $RESULTS"
    [ -n "$RESULTS" ] || exit 1
    case " $RESULTS " in
      *" failure "* | *" cancelled "*) exit 1 ;;
    esac
```

Required checks should point at the gate. The gate gets results only (`success`, `failure`, `cancelled`, `skipped`), never job outputs, so output text cannot fail it. A cancelled run leaves the gate red, and all-skipped results pass. `with:` may read `needs` (contexts availability table, `reference/workflows-and-actions/contexts`).

## Callee

```yaml
name: '<Workflow name>: <Job Name>' # quoted: an unquoted `: ` is a YAML error

on:
  workflow_call:
    inputs:
      <input_name>:
        description: <what>
        type: <string | boolean | number>
        required: <true | false>
        default: <value> # explicit when required is false
    secrets:
      <SECRET_NAME>:
        description: <what>
        required: <true | false>
    outputs:
      <output_name>:
        description: <what>
        value: ${{ jobs.<job-id>.outputs.<output_name> }}

permissions: {}

defaults:
  run:
    shell: sh

jobs:
  <job-id>:
    name: <Job Name>
    runs-on: <resolved ubuntu label>
    timeout-minutes: <n>
    permissions:
      contents: read
    environment: <name> # only when the job needs it
    container: # only when requested
      image: <name>:<exact tag>
    services: # only when requested
      <service-id>:
        image: <name>:<exact tag>
        options: --health-cmd <cmd> --health-interval 10s --health-timeout 5s --health-retries 5 # service readiness
    outputs:
      <output_name>: ${{ steps.<step-id>.outputs.<output_name> }}
    steps:
      - name: Check out repository
        uses: actions/checkout@<resolved ref>
        with:
          persist-credentials: false
      - name: <Verb phrase>
        env:
          <NAME>: ${{ inputs.<input_name> }} # untrusted or secret values only via env
        run: |
          set -eu
          <posix sh>
      - name: Remove temporary credentials
        if: ${{ always() }}
        run: |
          set -eu
          <cleanup, idempotent>
```

- `permissions: {}` at workflow level, then each job's own narrow set (the callee cannot raise the caller's token permissions, only keep or reduce).
- Write outputs in POSIX: `printf '%s=%s\n' "<name>" "$VALUE" >> "$GITHUB_OUTPUT"`.
- Artifacts: `actions/upload-artifact@<resolved ref>` with `name: <job>-<what>` unique per run, `retention-days: <n>`; downstream jobs download with `needs`.
- Caching: the setup action's built-in cache when it has one; otherwise `actions/cache@<resolved ref>` keyed on `hashFiles('<lockfile>')` with `restore-keys`.
- Cleanup steps: per practices.md `## Cleanup`; omit the step when the job creates nothing.
- Each callee declares only inputs and secrets it uses.

## Composite action

Extract steps into `.github/actions/<name>/action.yml` when the same steps repeat in 2 or more jobs or workflows; steps used once stay in the job. `<name>` is kebab-case from what the steps do (for example `setup-node-deps`).

```yaml
name: <Action name>
description: <what>

inputs:
  <input_name>:
    description: <what>
    required: <true | false>
    default: <value> # explicit when required is false

outputs:
  <output_name>:
    description: <what>
    value: ${{ steps.<step-id>.outputs.<output_name> }}

runs:
  using: composite
  steps:
    - name: <Verb phrase>
      shell: sh # required on every run step; defaults.run does not apply
      env:
        <NAME>: ${{ inputs.<input_name> }} # untrusted or secret values only via env
      run: |
        set -eu
        <posix sh>
```

Rules: `practices.md` `## Composite actions`.
