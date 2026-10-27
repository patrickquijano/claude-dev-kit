# .NET

## Detect

`*.sln`, `*.csproj`, `global.json`, `packages.lock.json`.

## Cache

- Key: `files: [packages.lock.json]` (key from the lockfile); paths: `.nuget/packages` (set `NUGET_PACKAGES`).
- Policy: `pull-push` (the default, not written) on the install or build job; `policy: pull` on every job that only reads the cache.

## Test and reports

- Test: `dotnet test`.
- Coverage: `dotnet test --collect:"XPlat Code Coverage"` writes Cobertura.
- Report types: `artifacts:reports:junit` for test results; `artifacts:reports:coverage_report` for coverage; `sast` and `dependency_scanning` when enabled. Set `expire_in` on each.

## Image

Images under `mcr.microsoft.com/dotnet` (`sdk` to build, `aspnet` or `runtime` to run). Match `TargetFramework` or `global.json`, then resolve the full tag.

## Deploy

Publish artifacts on tags; services get an `environment`.
