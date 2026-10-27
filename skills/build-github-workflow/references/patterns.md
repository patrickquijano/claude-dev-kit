# Patterns

Skeletons only. Replace each `<resolved>` per the version-resolution rules, and each `<cmd>` with the repo's detected command. Every skeleton already carries least-privilege permissions, a timeout, and concurrency.

## Contents

- CI · Release · Deploy · Scheduled · PR automation · Reusable

## CI

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [<default-branch>]
permissions:
  contents: read
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  test:
    runs-on: <resolved>
    timeout-minutes: 15
    steps:
      - name: Check out the repository
        uses: actions/checkout@<resolved> # <tag>
        with:
          persist-credentials: false
      - name: Set up the toolchain
        uses: <setup-action>@<resolved> # <tag>
        with:
          <setup-input>: <declared-version-or-file>
      - name: Install dependencies
        run: <install-cmd>
      - name: Test
        run: <test-cmd>
```

## Release

Trigger `push: tags: ['v*']`; `permissions: contents: read` at top; the release job adds `contents: write` and `environment:`; `concurrency.cancel-in-progress: false`. Steps: checkout, build, publish artifacts or create the release with the repo's existing tooling.

## Deploy

Trigger `push` to the deploy branch or `workflow_dispatch` with an `environment` input. The deploy job sets `environment: <name>`, adds `id-token: write` only when using OIDC, and `cancel-in-progress: false`.

## Scheduled

```yaml
on:
  schedule:
    - cron: '<minute> <hour> * * *'
  workflow_dispatch:
jobs:
  <job-id>:
    if: github.repository == '<owner>/<repo>'
```

## PR automation

Trigger `pull_request` (not `pull_request_target`). Grant `pull-requests: write` or `issues: write` on the one job that comments or labels. Pass PR fields through `env:`.

## Reusable

```yaml
name: Reusable <Name>
on:
  workflow_call:
    inputs:
      <input>:
        type: string
        required: true
    secrets:
      <secret>:
        required: false
permissions:
  contents: read
jobs:
  <job-id>:
    runs-on: <resolved>
    timeout-minutes: 15
    steps: []
```

Callers use `uses: ./.github/workflows/reusable-<name>.yml` and pass secrets by name.
