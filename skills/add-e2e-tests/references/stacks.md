# Stacks

Detection signals, runners, Recommended e2e frameworks, package manager, and targeted runs per stack, for `add-e2e-tests` and `cdk:repo-analyzer` kind `tests`.

## Contents

- Package manager · JavaScript / TypeScript · Python · Go · Rust · PHP · Ruby · JVM · Deno · .NET · Targeted runs

- `<x>` = package exec prefix in the "binary must be installed" form below; `--no-install` stops an npx/bunx download when the runner is missing.
- Configured = runner in dependencies (or on `PATH` for system tools) and its config file or manifest key present.
- Recommended = the framework proposed when none exists; an existing e2e tester always wins.

## Package manager

Detect per package, first match wins: the `packageManager` field in `package.json` (name before `@`); else a lockfile in the package dir, then the git root (`pnpm-lock.yaml` pnpm, `yarn.lock` yarn, `bun.lock` or `bun.lockb` bun, `package-lock.json` npm); else npm. Several lockfiles in one dir → ask (npm Recommended; unattended: npm, recorded under `Open:`); an analyzer reports `unknown` and the skill asks. Manager binary missing (`tool-check`) → stop.

| Manager | Exec, binary must be installed (`<x>`) |
| ------- | -------------------------------------- |
| npm     | `npx --no-install`                     |
| pnpm    | `pnpm exec`                            |
| yarn    | `yarn`                                 |
| bun     | `bunx --no-install`                    |

## JavaScript / TypeScript

Signals: `package.json`.

| Runner     | Signal                                        | Command               |
| ---------- | --------------------------------------------- | --------------------- |
| Playwright | `@playwright/test` dep, `playwright.config.*` | `<x> playwright test` |
| Cypress    | `cypress` dep, `cypress.config.*`             | `<x> cypress run`     |

- Recommended: Playwright (`@playwright/test`). API or CLI journeys may reuse the existing unit runner (Vitest, Jest, Mocha, `node:test`) as a separate suite.
- Playwright needs installed browsers (`<x> playwright install`); a `webServer` block starts the app itself.
- Cypress needs a running app unless the project starts one.

## Python

Signals: `pyproject.toml`, `setup.cfg`, `requirements*.txt`, `uv.lock`, `poetry.lock`. Interpreter `<py>`: `uv run python` when `uv.lock`, `poetry run python` when `poetry.lock`, else `.venv/bin/python`, else `python3`.

- Runner pytest: signal `pytest` dep, `[tool.pytest.ini_options]`, or `conftest.py`; command `<py> -m pytest`.
- Recommended: `pytest-playwright` (web UI) or pytest with `httpx` against the started app (API).
- Split by marker (`-m e2e`) or directory (`tests/e2e`) so it is its own suite.

## Go

Signals: `go.mod`. Recommended: `go test -tags e2e ./...` (files start `//go:build e2e`) with `net/http` against the started app.

## Rust

Signals: `Cargo.toml`. Recommended: `cargo test --test e2e` spawning the built binary.

## PHP

Signals: `composer.json`; binaries in `vendor/bin/`. Recommended: Laravel Dusk (Laravel, `tests/Browser`) or Playwright; PHPUnit or Pest stay for API journeys.

## Ruby

Signals: `Gemfile`. Recommended: RSpec system specs with Capybara (`spec/system`); command `bundle exec rspec spec/system`.

## JVM

Signals: `pom.xml` (Maven), `build.gradle*` (Gradle); `<mvn>` / `<gradle>` = wrapper when present, else the `PATH` binary. Recommended: the integration runner with a started app (REST Assured for APIs, Playwright for web UIs); commands `<mvn> -B verify` or `<gradle> <task>`.

## Deno

Signals: `deno.json`, `deno.jsonc`. Recommended: Playwright through `npm:` specifiers.

## .NET

Signals: `*.sln`, `*.csproj`, `*.fsproj`. Recommended: Playwright for .NET; command `dotnet test`.

## Targeted runs

Append to the runner command to run one test file or case:

| Runner                                       | Target                                              |
| -------------------------------------------- | --------------------------------------------------- |
| Playwright, Vitest, Jest, Mocha, Deno, RSpec | test file path                                      |
| Cypress                                      | `--spec <test file>`                                |
| pytest                                       | `path/to/test_x.py::test_name`                      |
| go test                                      | replace `./...` with the package path (`./pkg/...`) |
| cargo test                                   | test name filter                                    |
| dotnet test                                  | `--filter <name>`                                   |
| Maven                                        | `-Dit.test=<Class>`                                 |
| Gradle                                       | `--tests <Class>`                                   |
