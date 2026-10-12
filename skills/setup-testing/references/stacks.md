# Stacks

Detection signals, runners, recommended testers, and targeted runs per stack. Shared by `setup-testing`, the `write-*-tests` skills, and `test-gap-analyzer`.

- `<x>` = package exec prefix, the package-manager.md "binary must be installed" form: npm `npx --no-install`, pnpm `pnpm exec`, yarn `yarn`, bun `bunx --no-install`. `--no-install` stops an npx/bunx download when the runner is missing.
- Kind: unit, integration, e2e, other (type check, component, contract, static checks the project already uses).
- Configured = runner in dependencies (or on `PATH` for system tools) and its config file or manifest key present. Installed but unconfigured = dependency present, no config.
- Recommended = the tester `setup-testing` proposes for a kind when none exists; an existing tester of that kind always wins. Per-stack folder layout: `layout.md` beside this file.

## JavaScript / TypeScript

Signals: `package.json`. Package manager: detected per `setup-husky/references/package-manager.md` (`packageManager` field, else lockfile); the skill passes it to the analyzer.

| Runner     | Kind              | Signal                                             | Command               |
| ---------- | ----------------- | -------------------------------------------------- | --------------------- |
| Vitest     | unit, integration | `vitest` dep, `vitest.config.*` or `vite.config.*` | `<x> vitest run`      |
| Jest       | unit, integration | `jest` dep, `jest.config.*` or `jest` key          | `<x> jest --ci`       |
| Mocha      | unit, integration | `mocha` dep, `.mocharc.*`                          | `<x> mocha`           |
| node:test  | unit              | `*.test.{js,mjs,ts}` imports `node:test`           | `node --test`         |
| Playwright | e2e               | `@playwright/test` dep, `playwright.config.*`      | `<x> playwright test` |
| Cypress    | e2e               | `cypress` dep, `cypress.config.*`                  | `<x> cypress run`     |
| Bun test   | unit              | `bun.lock`/`bun.lockb`, tests import `bun:test`    | `bun test`            |
| TypeScript | other             | `typescript` dep, `tsconfig.json`                  | `<x> tsc --noEmit`    |

- Recommended: unit Vitest (Vite project or TypeScript/ESM; Jest when the project is React Native or already Babel-Jest based); integration the same runner as a separate Vitest project or config (`vitest.integration.config.*`); e2e Playwright (`@playwright/test`).
- Integration split: a separate config or project (for example `vitest.integration.config.*`, Jest `projects`) → its own suite with `--config <file>` or `--project <name>`.
- Playwright needs installed browsers (`<x> playwright install`); a `webServer` block starts the app itself.
- Cypress needs a running app unless the project starts one.

## Python

Signals: `pyproject.toml`, `setup.cfg`, `requirements*.txt`, `uv.lock`, `poetry.lock`. Interpreter: `uv run python` when `uv.lock`, `poetry run python` when `poetry.lock`, else project `.venv/bin/python` (Windows `.venv\Scripts\python.exe`), else `python3`.

| Runner   | Kind                   | Signal                                                   | Command               |
| -------- | ---------------------- | -------------------------------------------------------- | --------------------- |
| pytest   | unit, integration, e2e | `pytest` dep, `[tool.pytest.ini_options]`, `conftest.py` | `<py> -m pytest`      |
| unittest | unit                   | `test*.py` using `unittest`, no pytest                   | `<py> -m unittest`    |
| Django   | unit, integration      | `manage.py` + `django` dep                               | `<py> manage.py test` |
| mypy     | other                  | `mypy` dep or `[tool.mypy]`                              | `<py> -m mypy .`      |

- Recommended: unit pytest; integration pytest with the `integration` marker (`-m integration`); e2e `pytest-playwright` (web UI) or pytest with `httpx` against the started app (API).
- Integration or e2e split by marker (`-m integration`, `-m e2e`) or directory (`tests/integration`) → one suite each; `unit` runs with `-m "not integration and not e2e"`.
- Django projects keep Django's runner for unit and integration (Recommended there: `manage.py test`).

## Go

Signals: `go.mod`.

| Runner  | Kind              | Signal      | Command         |
| ------- | ----------------- | ----------- | --------------- |
| go test | unit, integration | `*_test.go` | `go test ./...` |
| go vet  | other             | `go.mod`    | `go vet ./...`  |

- Recommended: unit `go test` (standard `testing`); integration `go test -tags integration ./...` (files start `//go:build integration`); e2e `go test -tags e2e ./...` with `net/http` against the started app.

## Rust

Signals: `Cargo.toml`.

| Runner     | Kind              | Signal                    | Command      |
| ---------- | ----------------- | ------------------------- | ------------ |
| cargo test | unit, integration | `#[test]` or `tests/` dir | `cargo test` |

- Recommended: unit `cargo test` (`#[cfg(test)]` modules); integration `cargo test --test <name>` from `tests/`; e2e `cargo test --test e2e` spawning the built binary.

## PHP

Signals: `composer.json`. Run binaries from `vendor/bin/`.

| Runner  | Kind              | Signal                                | Command              |
| ------- | ----------------- | ------------------------------------- | -------------------- |
| PHPUnit | unit, integration | `phpunit/phpunit` dep, `phpunit.xml*` | `vendor/bin/phpunit` |
| Pest    | unit, integration | `pestphp/pest` dep                    | `vendor/bin/pest`    |

- Recommended: unit Pest (Laravel) or PHPUnit (other); integration Feature tests (`--testsuite Feature`); e2e Laravel Dusk (Laravel) or Playwright.
- Laravel layout: `tests/Unit`, `tests/Feature`, `tests/Browser`.

## Ruby

Signals: `Gemfile`.

| Runner | Kind              | Signal                         | Command             |
| ------ | ----------------- | ------------------------------ | ------------------- |
| RSpec  | unit, integration | `rspec` gem, `.rspec`, `spec/` | `bundle exec rspec` |

- Recommended: unit RSpec (`spec/models`, `spec/lib`); integration RSpec request specs (`spec/requests`); e2e RSpec system specs with Capybara (`spec/system`).

## JVM

Signals: `pom.xml` (Maven), `build.gradle*` (Gradle). `<mvn>` / `<gradle>` = wrapper when present (`./mvnw`, `./gradlew`), else `mvn` / `gradle` on `PATH`.

| Runner | Kind              | Signal                                               | Command           |
| ------ | ----------------- | ---------------------------------------------------- | ----------------- |
| Maven  | unit              | `src/test/`                                          | `<mvn> -B test`   |
| Maven  | integration       | failsafe plugin                                      | `<mvn> -B verify` |
| Gradle | unit, integration | `test` task, or integration task (`integrationTest`) | `<gradle> <task>` |

- Recommended: unit JUnit 5 through Surefire or the Gradle `test` task; integration Failsafe (`*IT`) or a Gradle `integrationTest` task; e2e the integration runner with a started app (REST Assured for APIs, Playwright for web UIs).
- Maven `verify` also runs Surefire unit tests; for a separate integration run use `<mvn> -B failsafe:integration-test failsafe:verify` after a build, and say in the context note when only `verify` is available.

## Deno

Signals: `deno.json`, `deno.jsonc`.

| Runner    | Kind              | Signal                   | Command     |
| --------- | ----------------- | ------------------------ | ----------- |
| deno test | unit, integration | `*_test.ts`, `*.test.ts` | `deno test` |

- Recommended: unit and integration `deno test` (integration under `tests/integration`, own task); e2e Playwright through `npm:` specifiers.

## .NET

Signals: `*.sln`, `*.csproj`, `*.fsproj`.

| Runner      | Kind              | Signal                            | Command       |
| ----------- | ----------------- | --------------------------------- | ------------- |
| dotnet test | unit, integration | test project (xunit/nunit/mstest) | `dotnet test` |

- Recommended: unit xUnit (`*.Tests` project); integration xUnit with `Microsoft.AspNetCore.Mvc.Testing` (`*.IntegrationTests` project); e2e Playwright for .NET.

## Targeted runs

Append to the runner command to run one test file or case:

| Runner                                                             | Target                                              |
| ------------------------------------------------------------------ | --------------------------------------------------- |
| Vitest, Jest, Mocha, Playwright, node:test, Bun, Deno, RSpec, Pest | test file path                                      |
| Cypress                                                            | `--spec <test file>`                                |
| pytest                                                             | `path/to/test_x.py::test_name`                      |
| unittest, Django                                                   | dotted module (`tests.test_x`)                      |
| go test                                                            | replace `./...` with the package path (`./pkg/...`) |
| cargo test                                                         | test name filter                                    |
| PHPUnit, dotnet test                                               | `--filter <name>`                                   |
| Maven                                                              | `-Dtest=<Class>` (`-Dit.test=<Class>` for failsafe) |
| Gradle                                                             | `--tests <Class>`                                   |
| TypeScript, mypy, go vet                                           | none; not a test suite, may run whole               |
