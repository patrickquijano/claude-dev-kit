# Layout

Skeletons for the orchestrator and callee files. `<…>` is filled from the request, repo facts, and the resolver table; no value here is a real version. Rules and reasons: `practices.md`. Delete `#` comments from output.

## Files

- `.github/workflows/<purpose>.yml`: orchestrator, one per trigger set (for example `ci.yml`).
- `.github/workflows/_<verb>-<noun>.yml`: one callee per job (for example `_lint.yml`, `_test.yml`, `_build-image.yml`).
- Shared by several orchestrators → keep the one callee; never copy it. A job used once still gets its own file.
- Existing repo layout or naming wins; update mode adds callees beside the existing files.

## Orchestrator

```yaml
name: <Title Case>

on:
  <event>: # only the events the request names; filters (branches, paths, types) explicit
    branches: [<branch>]

permissions: {} # least privilege; each job grants what it needs

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: <true for PR CI | false for deploy and release>

jobs:
  <job-id>:
    name: <Job Name> # shown with the callee's job name in checks; see practices Naming
    uses: ./.github/workflows/_<verb>-<noun>.yml
    needs: [<job-id>] # only real dependencies
    permissions:
      contents: read
    with:
      <input_name>: ${{ <expression> }}
    secrets:
      <SECRET_NAME>: ${{ secrets.<SECRET_NAME> }} # explicit; never inherit
```

- Caller job keys: `name`, `uses`, `with`, `secrets`, `strategy`, `needs`, `if`, `concurrency`, `permissions` only. `environment`, `runs-on`, `steps`, `timeout-minutes`, `env` belong to the callee.
- Callee outputs are read as `needs.<job-id>.outputs.<output_name>` and passed on through `with:`.
- Untrusted event data (titles, bodies, branch names) never goes in `with:` for a callee that uses it in a script; see practices `## Untrusted input and secrets`.

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
name: '<Orchestrator>: <Job>' # quoted: an unquoted `: ` is a YAML error

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
      image: <name>:<exact tag> # SHA mode: <name>:<exact tag>@sha256:<digest>
    services: # only when requested
      <service-id>:
        image: <name>:<exact tag> # SHA mode adds @sha256:<digest>
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
- Cleanup steps (`if: ${{ always() }}`) only for what the job created: registry logout, temp credential and file removal under `$RUNNER_TEMP`, container and network removal. Omit the step when the job creates nothing.
- Each callee declares only inputs and secrets it uses.
