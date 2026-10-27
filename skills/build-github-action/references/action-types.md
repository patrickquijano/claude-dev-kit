# Action types

Skeletons only; replace each `<…>`. Pick by the task: shell glue and other actions → composite; logic needing libraries or fast start → JavaScript; a specific OS-level toolchain → Docker (Linux runners only).

## Contents

- Composite · JavaScript · Docker · Test workflow · README template

## Composite

```yaml
name: <Title>
description: <one sentence>
author: <owner>
inputs:
  <input-id>:
    description: <meaning>
    required: false
    default: '<value>'
outputs:
  <output-id>:
    description: <meaning>
    value: ${{ steps.<step-id>.outputs.<output-id> }}
runs:
  using: composite
  steps:
    - name: <Step>
      id: <step-id>
      shell: sh
      env:
        INPUT_<NAME>: ${{ inputs.<input-id> }}
      run: |
        set -eu
        <script>
```

## JavaScript

```yaml
runs:
  using: <node-runtime-resolved>
  main: dist/index.js
```

Source in `src/`, bundled with the repo's bundler to `dist/index.js` and committed; `package.json` lists `@actions/core` at the resolved version; scripts `lint`, `test`, `build`. Use `core.getInput`, `core.setOutput`, `core.setFailed`.

## Docker

```yaml
runs:
  using: docker
  image: Dockerfile
  args:
    - ${{ inputs.<input-id> }}
```

`Dockerfile`: `FROM <image>:<tag>@sha256:<digest>`, a non-root `USER`, `ENTRYPOINT ["/entrypoint.sh"]`.

## Test workflow

`test-<action-name>.yml`, triggers `pull_request` (paths limited to the action) and `workflow_dispatch`:

```yaml
name: Test <Action Name>
on:
  pull_request:
    paths: ['<action-dir>/**']
  workflow_dispatch:
permissions:
  contents: read
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  test:
    runs-on: <resolved>
    timeout-minutes: 10
    steps:
      - name: Check out the repository
        uses: actions/checkout@<resolved> # <tag>
        with:
          persist-credentials: false
      - name: Run the action
        id: run
        uses: ./<action-dir>
        with:
          <input-id>: <sample>
      - name: Check the output
        env:
          RESULT: ${{ steps.run.outputs.<output-id> }}
        run: test "$RESULT" = "<expected>"
```

## README template

Sections: title and one-line purpose; Usage (a `uses:` snippet pinned to the release tag); Inputs table (name, description, required, default); Outputs table; Permissions needed; Examples; Development (test and build commands); License. Add a CHANGELOG when the action is published.
