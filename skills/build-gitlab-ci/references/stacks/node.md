# Node

## Detect

`package.json`; `package-lock.json` (npm), `pnpm-lock.yaml` (pnpm), `yarn.lock` (yarn), `bun.lock` (bun). Scripts in `package.json` give the build, lint, and test commands.

## Cache

- Key: `files: [package-lock.json]` (key from the lockfile); paths: the package manager store (`.npm`, or the pnpm and yarn equivalents), not `node_modules`.
- Policy: `pull-push` (the default, not written) on the install or build job; `policy: pull` on every job that only reads the cache.

## Test and reports

- Test: the `test` script; add a JUnit reporter when the runner supports one.
- Coverage: Cobertura output from the test runner, when it emits it.
- Report types: `artifacts:reports:junit` for test results; `artifacts:reports:coverage_report` for coverage; `dependency_scanning` and `sast` only when the project enables those scanners. Set `expire_in` on each.

## Image

Image family `node`; variant `alpine` unless a native module needs glibc (then `slim`). Match the `engines` field or `.nvmrc` major, then resolve the full tag.

## Deploy

Static sites and containers: an `environment` with a `name` and `url`; deploy jobs run on the default branch or tags only.
