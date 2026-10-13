# Stacks

Package detection, unit runners, and the Recommended unit tester per stack. `<x>`, `<py>`, `<mvn>`, `<gradle>` are the prefixes defined here.

## Contents

- Package manager · Packages · Runners per stack

## Package manager

JS packages only. Detect per package, first match wins: the `packageManager` field in `package.json` (name before `@`); else a lockfile in the package dir, then the git root (`pnpm-lock.yaml` pnpm, `yarn.lock` yarn, `bun.lock` or `bun.lockb` bun, `package-lock.json` npm); else npm. Several lockfiles in one dir → AskUserQuestion: npm (Recommended) | pnpm | yarn | bun. Manager binary missing (`command -v`) → stop.

| Manager | `<x>` (binary must be installed) |
| ------- | -------------------------------- |
| npm     | `npx --no-install`               |
| pnpm    | `pnpm exec`                      |
| yarn    | `yarn`                           |
| bun     | `bunx --no-install`              |

## Packages

Manifests mark a package: `package.json`, `pyproject.toml`, `setup.cfg`, `requirements*.txt`, `go.mod`, `Cargo.toml`, `composer.json`, `Gemfile`, `pom.xml`, `build.gradle*`, `deno.json`, `*.csproj`, `*.sln`. Monorepo → one package per manifest dir the scope touches; else the project dir.

## Runners per stack

Configured = runner in dependencies (or on `PATH`) and its config file or manifest key present. An existing runner always wins over the Recommended one.

| Stack  | Runner and signal                                                                                                          | Unit command                                                              | Recommended                                           |
| ------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| JS/TS  | Vitest (`vitest` dep, `vitest.config.*`); Jest (`jest` dep or key); Mocha (`.mocharc.*`); node:test; Bun test (`bun:test`) | `<x> vitest run`, `<x> jest --ci`, `<x> mocha`, `node --test`, `bun test` | Vitest (Jest for React Native or Babel-Jest projects) |
| Python | pytest (`pytest` dep, `conftest.py`); unittest; Django (`manage.py`)                                                       | `<py> -m pytest`, `<py> -m unittest`, `<py> manage.py test`               | pytest (Django keeps `manage.py test`)                |
| Go     | `*_test.go`                                                                                                                | `go test ./...`                                                           | `go test`                                             |
| Rust   | `#[test]`                                                                                                                  | `cargo test`                                                              | `cargo test` (`#[cfg(test)]` modules)                 |
| PHP    | PHPUnit (`phpunit.xml*`); Pest (`pestphp/pest`)                                                                            | `vendor/bin/phpunit`, `vendor/bin/pest`                                   | Pest for Laravel, else PHPUnit (`tests/Unit`)         |
| Ruby   | RSpec (`.rspec`, `spec/`)                                                                                                  | `bundle exec rspec`                                                       | RSpec (`spec/models`, `spec/lib`)                     |
| JVM    | Maven (`src/test/`); Gradle (`test` task)                                                                                  | `<mvn> -B test`, `<gradle> test`                                          | JUnit 5 through Surefire or Gradle `test`             |
| Deno   | `*_test.ts`, `*.test.ts`                                                                                                   | `deno test`                                                               | `deno test`                                           |
| .NET   | test project (xunit, nunit, mstest)                                                                                        | `dotnet test`                                                             | xUnit (`*.Tests` project)                             |

- Python interpreter `<py>`: `uv run python` when `uv.lock`, `poetry run python` when `poetry.lock`, else `.venv/bin/python`, else `python3`.
- JVM `<mvn>` / `<gradle>`: the wrapper when present (`./mvnw`, `./gradlew`), else the binary on `PATH`.
- Unit runs exclude other kinds: pytest `-m "not integration and not e2e"`; Go `go test ./...` without build tags; Jest and Vitest honor the project's separate integration config.
