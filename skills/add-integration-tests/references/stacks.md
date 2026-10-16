# Stacks

Detection signals, integration runners, Recommended testers, and targeted runs per stack, for this skill and `cdk:test-gap-analyzer`.

## Contents

- Package manager · JavaScript / TypeScript · Python · Go · Rust · PHP · Ruby · JVM · Deno · .NET · Targeted runs

- `<x>` = package exec prefix, the "binary must be installed" form below. `--no-install` stops an npx/bunx download when the runner is missing.
- Configured = runner in dependencies (or on `PATH`) and its config file or manifest key present. An existing integration tester always wins over the Recommended one.

## Package manager

Detect per package, first match wins: the `packageManager` field in `package.json` (name before `@`); else a lockfile in the package dir, then the git root (`pnpm-lock.yaml` pnpm, `yarn.lock` yarn, `bun.lock` or `bun.lockb` bun, `package-lock.json` npm); else npm. Several lockfiles in one dir → ask (npm Recommended); an analyzer reports `unknown` and the skill asks. Manager binary missing (`command -v`) → stop.

| Manager | Exec, binary must be installed (`<x>`) |
| ------- | -------------------------------------- |
| npm     | `npx --no-install`                     |
| pnpm    | `pnpm exec`                            |
| yarn    | `yarn`                                 |
| bun     | `bunx --no-install`                    |

## JavaScript / TypeScript

Signals: `package.json`.

| Runner    | Signal                                             | Command          |
| --------- | -------------------------------------------------- | ---------------- |
| Vitest    | `vitest` dep, `vitest.config.*` or `vite.config.*` | `<x> vitest run` |
| Jest      | `jest` dep, `jest.config.*` or `jest` key          | `<x> jest --ci`  |
| Mocha     | `mocha` dep, `.mocharc.*`                          | `<x> mocha`      |
| node:test | `*.test.{js,mjs,ts}` imports `node:test`           | `node --test`    |

- Recommended: the unit runner as a separate Vitest project or config (`vitest.integration.config.*`).
- Split: a separate config or project → its own suite with `--config <file>`, Vitest `--project <name>`, or Jest `--selectProjects <displayName>` (each Jest project needs a `displayName`).

## Python

Signals: `pyproject.toml`, `setup.cfg`, `requirements*.txt`, `uv.lock`, `poetry.lock`. Interpreter `<py>`: `uv run python` when `uv.lock`, `poetry run python` when `poetry.lock`, else project `.venv/bin/python` (Windows `.venv\Scripts\python.exe`), else `python3`.

| Runner   | Signal                                                   | Command               |
| -------- | -------------------------------------------------------- | --------------------- |
| pytest   | `pytest` dep, `[tool.pytest.ini_options]`, `conftest.py` | `<py> -m pytest`      |
| unittest | `test*.py` using `unittest`, no pytest                   | `<py> -m unittest`    |
| Django   | `manage.py` + `django` dep                               | `<py> manage.py test` |

- Recommended: pytest with the `integration` marker, run as `-o addopts="" -m integration` so a default `-m` in `addopts` cannot interfere. Django keeps `manage.py test`.
- Split by marker (`-m integration`) or directory (`tests/integration`); unit runs with `-m "not integration and not e2e"`.

## Go

Signals: `go.mod`. Runner: `go test` (`*_test.go`). Recommended: `go test -tags integration ./...` with files starting `//go:build integration`.

## Rust

Signals: `Cargo.toml`. Runner: `cargo test`. Recommended: `cargo test --test <name>` from `tests/`.

## PHP

Signals: `composer.json`; binaries in `vendor/bin/`. Runners: PHPUnit (`phpunit/phpunit`, `phpunit.xml*`), Pest (`pestphp/pest`). Recommended: Feature tests (`--testsuite Feature`); Laravel layout `tests/Feature`.

## Ruby

Signals: `Gemfile`. Runner: RSpec (`rspec` gem, `.rspec`, `spec/`), `bundle exec rspec`. Recommended: request specs (`spec/requests`).

## JVM

Signals: `pom.xml` (Maven), `build.gradle*` (Gradle). `<mvn>` / `<gradle>` = wrapper when present (`./mvnw`, `./gradlew`), else the tool on `PATH`.

- Maven integration: failsafe plugin, `<mvn> -B verify` (also runs unit tests); a separate run: `<mvn> -B failsafe:integration-test failsafe:verify` after a build.
- Gradle integration: a `test` or `integrationTest` task, `<gradle> <task>`.
- Recommended: Failsafe (`*IT`) or a Gradle `integrationTest` task.

## Deno

Signals: `deno.json`, `deno.jsonc`. Runner: `deno test`. Recommended: integration under `tests/integration` with its own task.

## .NET

Signals: `*.sln`, `*.csproj`, `*.fsproj`. Runner: `dotnet test` (xunit, nunit, mstest). Recommended: xUnit with `Microsoft.AspNetCore.Mvc.Testing` in a `*.IntegrationTests` project.

## Targeted runs

| Runner                                            | Target                                              |
| ------------------------------------------------- | --------------------------------------------------- |
| Vitest, Jest, Mocha, node:test, Deno, RSpec, Pest | test file path                                      |
| pytest                                            | `path/to/test_x.py::test_name`                      |
| unittest, Django                                  | dotted module (`tests.test_x`)                      |
| go test                                           | replace `./...` with the package path (`./pkg/...`) |
| cargo test                                        | test name filter                                    |
| PHPUnit, dotnet test                              | `--filter <name>`                                   |
| Maven                                             | `-Dit.test=<Class>` (failsafe)                      |
| Gradle                                            | `--tests <Class>`                                   |
