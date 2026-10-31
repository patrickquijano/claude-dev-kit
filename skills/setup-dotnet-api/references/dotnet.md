# Dotnet

## Contents

- Layout · References · Packages · Features · Data · JSON:API · Index

## Layout

Create exactly:

```text
<RepoNamePascalCase>.slnx
global.json
Directory.Build.props
Directory.Packages.props
src/Domain/Domain.csproj
src/Application/Application.csproj
src/Infrastructure/Infrastructure.csproj
src/Presentation/WebApi/Presentation.WebApi.csproj
tests/Domain/Domain.UnitTests.csproj
tests/Application/Application.UnitTests.csproj
tests/Infrastructure/Infrastructure.UnitTests.csproj
tests/Presentation/WebApi/Presentation.WebApi.UnitTests.csproj
tests/IntegrationTests.csproj
```

- Scaffold with `new-global`, `new-sln`, `new-proj`, `sln-add`; move any file that would collide only through a plan entry.
- Central Package Management in `Directory.Packages.props`; shared properties (nullable, implicit usings, warnings as errors) in `Directory.Build.props`.
- Accept: every path exists; the solution lists all projects.

## References

- Domain → none. Application → Domain. Infrastructure → Application. WebApi → Application and Infrastructure (composition root only). Each unit test project → its target. IntegrationTests → WebApi.
- Accept: `add-ref` edges match this graph and no other.

## Packages

- Per project via `add-pkg`; versions from the resolver, recorded in `Directory.Packages.props`.
- Infrastructure: EF Core and the picked provider, the picked store clients. WebApi: Scalar, `Microsoft.AspNetCore.OpenApi` (development only), Serilog, FluentValidation DI extensions, ULID. Tests: xUnit, mocking, faker, assertions (each license-checked), `Microsoft.AspNetCore.Mvc.Testing`, Testcontainers for each picked store.
- D1: `<Compile Remove>` or `DefaultItemExcludes` in `tests/IntegrationTests.csproj`.
- Accept: `build` passes.

## Features

- Features folders per layer; `Application/Features/<Feature>/Commands/` and `.../Queries/`, with the picked dispatcher or hand-rolled handlers.
- Accept: a sample feature compiles and has a unit test.

## Data

- ULID primary keys through an EF value converter and convention; `created_at` and `updated_at` columns at precision 6, set by a `SaveChanges` interceptor.
- Snake_case names through the cited convention package, or manual mapping (D5).
- Accept: a migration or model snapshot shows the ULID key and precision 6 columns.

## JSON:API

- One error format per the API style pick; no ProblemDetails alongside JSON:API `errors` (D3).
- Accept: an unknown route and a validation failure both return the picked error document.

## Index

- `/` is left unmapped; nothing is rendered.
- Accept: a request to `/` returns 404 with no body from a default page.
