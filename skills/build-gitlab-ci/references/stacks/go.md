# Go

## Detect

`go.mod`, `go.sum`.

## Cache

- Key: `files: [go.sum]` (key from the lockfile); paths: `.go/pkg/mod` with `GOPATH` set under the project dir.
- Policy: `pull-push` (the default, not written) on the install or build job; `policy: pull` on every job that only reads the cache.

## Test and reports

- Test: `go test ./...`.
- Coverage: `go test -coverprofile` converted to Cobertura with a converter the project already uses.
- Report types: `artifacts:reports:junit` for test results; `artifacts:reports:coverage_report` for coverage; `sast` when enabled. Set `expire_in` on each.

## Image

Image family `golang`; variant `alpine`. Match the `go` directive in `go.mod`, then resolve the full tag.

## Deploy

Binaries: release artifacts on tags. Containers: see the docker stack.
