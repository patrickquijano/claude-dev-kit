# Stacks

Detection signals, runners, and hook commands per stack. Commands call the runner directly, never a project script, so strict flags stay in the hook.

- `<x>` = package exec prefix: npm `npx --no-install`, pnpm `pnpm exec`, yarn `yarn`, bun `bunx --no-install`. `--no-install` stops an npx/bunx download when the runner is missing.
- Feasible = runner in dependencies (or on `PATH` for system tools), its config or default layout present, and at least one matching test file.
- `warn` = RegExp literal for the `warn` suite field (`m` flag, never `g`); set it only when no flag turns warnings into failures. Match a line start so test names do not trigger it.
- Kind: unit, integration, e2e, other (type check, component, contract, static checks the project already uses). Only unit suites go into the hook; every detected kind goes into the project-context note and VS Code tasks.

## JavaScript / TypeScript

Signals: `package.json`; lockfile picks the package manager (`pnpm-lock.yaml`, `yarn.lock`, `bun.lock`/`bun.lockb`, `package-lock.json`) or the `packageManager` field.

| Runner     | Kind              | Signal                                             | Command                                                | Warnings                                              |
| ---------- | ----------------- | -------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| Vitest     | unit, integration | `vitest` dep, `vitest.config.*` or `vite.config.*` | `<x> vitest run --bail=1`                              | `warn: /^\s*(\(node:\d+\) )?(\[\w+\] )?\w*Warning:/m` |
| Jest       | unit, integration | `jest` dep, `jest.config.*` or `jest` key          | `<x> jest --ci --bail`                                 | same `warn`                                           |
| Mocha      | unit, integration | `mocha` dep, `.mocharc.*`                          | `<x> mocha --bail --forbid-only`                       | same `warn`                                           |
| node:test  | unit              | `*.test.{js,mjs,ts}` imports `node:test`           | `node --test` (no fail-fast flag)                      | same `warn`                                           |
| Playwright | e2e               | `@playwright/test` dep, `playwright.config.*`      | `<x> playwright test --max-failures=1 --reporter=line` | none                                                  |
| Cypress    | e2e               | `cypress` dep, `cypress.config.*`                  | `<x> cypress run` (no fail-fast flag)                  | none                                                  |
| Bun test   | unit              | `bun.lock`/`bun.lockb`, tests import `bun:test`    | `bun test --bail`                                      | same `warn`                                           |
| TypeScript | other             | `typescript` dep, `tsconfig.json`                  | `<x> tsc --noEmit`                                     | none; `tsc` has no warnings                           |

- Integration split: a separate config or project (for example `vitest.integration.config.*`, Jest `projects`) → its own suite with `--config <file>` or `--project <name>`.
- Playwright needs installed browsers (`npx playwright install`); missing → not feasible, say why. A `webServer` block starts the app itself; without one the app must already run, so not feasible.
- Cypress needs a running app unless the project starts one; no running server → not feasible.

## Python

Signals: `pyproject.toml`, `setup.cfg`, `requirements*.txt`, `uv.lock`, `poetry.lock`. Interpreter: `uv run python` when `uv.lock`, `poetry run python` when `poetry.lock`, else project `.venv/bin/python` (Windows `.venv\Scripts\python.exe`), else `python3`.

| Runner   | Kind                   | Signal                                                   | Command                          | Warnings                           |
| -------- | ---------------------- | -------------------------------------------------------- | -------------------------------- | ---------------------------------- |
| pytest   | unit, integration, e2e | `pytest` dep, `[tool.pytest.ini_options]`, `conftest.py` | `<py> -m pytest -x -W error`     | `-W error` fails on warnings       |
| unittest | unit                   | `test*.py` using `unittest`, no pytest                   | `<py> -m unittest --failfast`    | `env: { PYTHONWARNINGS: 'error' }` |
| Django   | unit, integration      | `manage.py` + `django` dep                               | `<py> manage.py test --failfast` | `env: { PYTHONWARNINGS: 'error' }` |
| mypy     | other                  | `mypy` dep or `[tool.mypy]`                              | `<py> -m mypy .`                 | none                               |

- Integration or e2e split by marker (`-m integration`) or directory (`tests/integration`) → one suite each.
- Suites that share a database or port → later group.

## Go

Signals: `go.mod`.

| Runner  | Kind              | Signal      | Command                   | Warnings |
| ------- | ----------------- | ----------- | ------------------------- | -------- |
| go test | unit, integration | `*_test.go` | `go test -failfast ./...` | none     |
| go vet  | other             | `go.mod`    | `go vet ./...`            | none     |

- Integration behind a build tag (`//go:build integration`) → separate suite `go test -failfast -tags integration ./...`.

## Rust

Signals: `Cargo.toml`.

| Runner     | Kind              | Signal                    | Command      | Warnings                                                             |
| ---------- | ----------------- | ------------------------- | ------------ | -------------------------------------------------------------------- |
| cargo test | unit, integration | `#[test]` or `tests/` dir | `cargo test` | `env: { RUSTFLAGS: '-D warnings', CARGO_TARGET_DIR: 'target/hook' }` |

- `cargo test` stops after the first failing test binary by default (`--no-fail-fast` turns that off).
- Own `CARGO_TARGET_DIR`: changed `RUSTFLAGS` would otherwise invalidate the normal build cache on every run.

## PHP

Signals: `composer.json`. Run binaries from `vendor/bin/`.

| Runner  | Kind              | Signal                                | Command                                                 | Warnings            |
| ------- | ----------------- | ------------------------------------- | ------------------------------------------------------- | ------------------- |
| PHPUnit | unit, integration | `phpunit/phpunit` dep, `phpunit.xml*` | `vendor/bin/phpunit --stop-on-defect --fail-on-warning` | `--fail-on-warning` |
| Pest    | unit, integration | `pestphp/pest` dep                    | `vendor/bin/pest --bail`                                | none                |

## Ruby

Signals: `Gemfile`.

| Runner | Kind              | Signal                         | Command                         | Warnings |
| ------ | ----------------- | ------------------------------ | ------------------------------- | -------- |
| RSpec  | unit, integration | `rspec` gem, `.rspec`, `spec/` | `bundle exec rspec --fail-fast` | none     |

## JVM

Signals: `pom.xml` (Maven), `build.gradle*` (Gradle). `<mvn>` / `<gradle>` = wrapper when present (`./mvnw`, `./gradlew`), else `mvn` / `gradle` on `PATH`. The script maps `/` to `\` on Windows; use `mvnw.cmd` / `gradlew.bat` there.

| Runner | Kind              | Signal                                               | Command                                                                                 | Warnings |
| ------ | ----------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| Maven  | unit              | `src/test/`                                          | `<mvn> -B test -Dsurefire.skipAfterFailureCount=1`                                      | none     |
| Maven  | integration       | failsafe plugin                                      | `<mvn> -B verify -Dsurefire.skipAfterFailureCount=1 -Dfailsafe.skipAfterFailureCount=1` | none     |
| Gradle | unit, integration | `test` task, or integration task (`integrationTest`) | `<gradle> <task> --fail-fast`                                                           | none     |

- Maven `verify` also runs unit tests; pick it instead of `test` when integration is selected, never both.

## Deno

Signals: `deno.json`, `deno.jsonc`.

| Runner    | Kind              | Signal                   | Command                 | Warnings |
| --------- | ----------------- | ------------------------ | ----------------------- | -------- |
| deno test | unit, integration | `*_test.ts`, `*.test.ts` | `deno test --fail-fast` | none     |

## .NET

Signals: `*.sln`, `*.csproj`, `*.fsproj`.

| Runner      | Kind              | Signal                            | Command                                     | Warnings                      |
| ----------- | ----------------- | --------------------------------- | ------------------------------------------- | ----------------------------- |
| dotnet test | unit, integration | test project (xunit/nunit/mstest) | `dotnet test -p:TreatWarningsAsErrors=true` | `TreatWarningsAsErrors` build |

- No fail-fast flag; the hook still stops other suites on the first failure.

## Targeted runs

Narrowing argument for the project-context note (step 10), appended to the suite's hook command unless the row says otherwise.

| Runner                                                             | Narrow to changed code                                                                        |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Vitest, Jest, Mocha, Playwright, node:test, Bun, Deno, RSpec, Pest | test file path                                                                                |
| Cypress                                                            | `--spec <test file>`                                                                          |
| pytest                                                             | `path/to/test_x.py::test_name`                                                                |
| unittest, Django                                                   | dotted module (`tests.test_x`)                                                                |
| go test                                                            | replace `./...` with the package path (`./pkg/...`)                                           |
| cargo test                                                         | test name filter                                                                              |
| PHPUnit, dotnet test                                               | `--filter <name>`                                                                             |
| Maven                                                              | `-Dtest=<Class>` (`-Dit.test=<Class>` for failsafe) `-Dsurefire.failIfNoSpecifiedTests=false` |
| Gradle                                                             | `--tests <Class>`                                                                             |
| TypeScript, mypy, go vet                                           | none; not a test suite, may run whole                                                         |

## Cache inputs

`inputs` = git pathspecs, relative to the suite's `cwd`, of every file that can change the suite's result: source and test dirs, runner config, manifest, lockfile. The script skips a suite when these files and the suite definition match its last pass. Missing a file here lets a stale pass hide a failure, so when unsure use `['.']` (the default: any change in `cwd` reruns it).

| Stack                 | Inputs                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| JavaScript/TypeScript | source + test dirs, `package.json`, lockfile, runner config, `tsconfig*.json`                          |
| Python                | package + test dirs, `pyproject.toml`, `setup.cfg`, lockfile or `requirements*.txt`, `conftest.py`     |
| Go                    | `.` (packages import each other; `go test` also caches results itself, so never add `-count=1`)        |
| Rust                  | `src`, `tests`, `benches`, `Cargo.toml`, `Cargo.lock`, `build.rs`                                      |
| PHP                   | `src`, `app`, `tests`, `composer.json`, `composer.lock`, `phpunit.xml*`                                |
| Ruby                  | `app`, `lib`, `spec`, `Gemfile`, `Gemfile.lock`, `.rspec`                                              |
| JVM                   | `src`, build files (`pom.xml`, `build.gradle*`, `settings.gradle*`); Gradle also skips up-to-date work |
| Deno                  | source + test dirs, `deno.json*`, `deno.lock`                                                          |
| .NET                  | `.` (projects reference each other)                                                                    |

- Monorepo package that imports sibling packages → add their paths (`../shared`), or use `:(top)` pathspecs.
- Gitignored files (`.env*`, generated files) are never inputs: git does not list them, so their edits never invalidate the cache. Tests depend on one → rerun with `CDK_RUN_TESTS_FORCE=1` after editing it.
- Outside git → no cache; every suite runs.

## Parallel safety

- Parallel in group 1: suites with no shared state (unit, type check, lint-style checks).
- Later group, one suite each: suites that bind the same port, reset the same database, or start the same browser server.
- Unknown sharing → later group; serial is slower but correct.
