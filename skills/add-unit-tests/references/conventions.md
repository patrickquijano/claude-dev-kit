# Unit test conventions

Rules for the tests this skill writes and for `cdk:repo-analyzer` kind `tests`. Runner detection lives in `stacks.md` beside this file.

## Contents

- Shared rules · Faker libraries · Coverage · Unit · ES modules · ES module safety · Official docs

## Shared rules

- AAA: every test has three blocks in order, Arrange, Act, Assert, split by a blank line or `// Arrange` / `// Act` / `// Assert` comments. One Act per test, so a failure points at one behavior.
- Faker: generate every input with the stack's faker library, never hand-typed literals, so tests do not pass by coincidence of one value. Seed once per file or run (fixed seed, or a logged random seed) so a failure reproduces. Expected values derive from the generated inputs. Literals stay only where the value is the behavior under test: boundaries (`0`, empty string, `null`, max length), enum members, error codes.
- Never edit production code. A test that fails because the code looks wrong → report the evidence (input, expected, actual, `file:line`) and keep the failing test, listing the suspected bug in the Output. Tests never bend to a bug; a test kept failing leaves the fix loops.
- Match the project: existing test location, file naming, runner, assertion style, helpers, and fixtures win over the defaults here. No tests yet → the runner's documented default layout.
- Missing tooling (runner, coverage provider, faker library) → chain `cdk:setup-testing unit <package>`; it asks per tool, installs only the picked one as a dev dependency, and configures it. Never install unasked.
- Decisions with several fitting answers (runner, mock library, layout) → take the Recommended pick, no question, and report each pick with its reason. Derivable from the repo → use it.
- Best practices: apply this file, then WebFetch the detected runner's official docs (Official docs list, else the runner's manifest `homepage`). WebFetch unavailable or failing → bundled rules only; say so in the Output.
- Independent and order-free: no test depends on another test's state or run order; each cleans up what it creates.
- Names state behavior and condition (`returns empty list when user has no orders`), not the method name alone.
- No fixed sleeps; wait on a condition or use fake timers.
- No secrets in tests; read real credentials from env vars and keep them out of fixtures and snapshots.

## Faker libraries

| Stack                 | Library                                      | Seed                                        |
| --------------------- | -------------------------------------------- | ------------------------------------------- |
| JavaScript/TypeScript | `@faker-js/faker`                            | `faker.seed(n)`                             |
| Deno                  | `npm:@faker-js/faker`                        | `faker.seed(n)`                             |
| Python                | `Faker` (pytest `faker` fixture with plugin) | `Faker.seed(n)`                             |
| Go                    | `github.com/brianvoe/gofakeit/v7`            | `gofakeit.Seed(n)`                          |
| Rust                  | `fake`                                       | seeded `rand` RNG passed to `fake_with_rng` |
| PHP                   | `fakerphp/faker`                             | `$faker->seed(n)`                           |
| Ruby                  | `faker` gem                                  | `Faker::Config.random = Random.new(n)`      |
| JVM                   | `net.datafaker:datafaker`                    | `new Faker(new Random(n))`                  |
| .NET                  | `Bogus`                                      | `Randomizer.Seed = new Random(n)`           |

## Coverage

| Runner      | Coverage command or provider                                                    |
| ----------- | ------------------------------------------------------------------------------- |
| Vitest      | `<x> vitest run --coverage` with `@vitest/coverage-v8`                          |
| Jest        | `<x> jest --coverage`                                                           |
| Mocha       | `<x> c8 mocha`                                                                  |
| node:test   | `node --test --experimental-test-coverage`                                      |
| Bun test    | `bun test --coverage`                                                           |
| pytest      | `<py> -m pytest --cov=<pkg> --cov-report=term-missing` with `pytest-cov`        |
| unittest    | `<py> -m coverage run -m unittest` then `<py> -m coverage report -m`            |
| Django      | `<py> -m coverage run manage.py test` then `<py> -m coverage report -m`         |
| go test     | `go test -coverprofile=cover.out ./...` then `go tool cover -func=cover.out`    |
| cargo test  | `cargo llvm-cov` (`cargo-llvm-cov`)                                             |
| PHPUnit     | `vendor/bin/phpunit --coverage-text` with Xdebug or PCOV                        |
| Pest        | `vendor/bin/pest --coverage` with Xdebug or PCOV                                |
| RSpec       | `bundle exec rspec` with SimpleCov started in `spec_helper.rb`                  |
| Maven       | `<mvn> -B test jacoco:report` (JaCoCo plugin); read `target/site/jacoco`        |
| Gradle      | `<gradle> test jacocoTestReport` (`jacoco` plugin); read `build/reports/jacoco` |
| deno test   | `deno test --coverage` then `deno coverage`                                     |
| dotnet test | `dotnet test --collect:"XPlat Code Coverage"` (coverlet)                        |

- Metric: the one the input names (line, branch, statement, function); else line coverage.
- Exclude from the denominator only what the project already excludes, plus tests, generated code, vendored code, and build output. Never add exclusions to reach the target.

## Unit

- Unit under test: one public function or method. Collaborators that do I/O (network, database, filesystem, clock, randomness, env, processes) → test double at the boundary; pure collaborators run real.
- Per public function or method in scope: at least 2 positive cases (valid inputs, expected result) and at least 2 negative cases (invalid input, thrown error, rejected promise, edge or boundary).
- No integration in unit tests: no real database, network, filesystem, container, or running server. Such a test belongs to `cdk:add-integration-tests`.
- Assert behavior through the public API, not private state or call order, unless the call is the behavior (a sent email).
- Mock only what the unit owns the contract with; prefer fakes and stubs over strict mocks.
- Fast: each test well under a second; slow → a hidden integration.

## ES modules

- JS/TS ES modules (`.mjs`, `.js`, `.ts` with `import`/`export`): unit tests go in `tests/unit/` at the mirrored source path (`src/a/b.mjs` → `tests/unit/src/a/b.test.mjs`). This overrides "Match the project" for location only; runner, assertion style, and helpers still match the project.
- Testable modules export logic as named functions, take side effects (runner, `fs`, env, clock, stdin/stdout) as a `deps` parameter defaulting to the real one, and keep the CLI body behind a main guard. Changing a module to fit is a production edit: report it as `Needs refactor:` and leave it untested.
- Existing unit tests outside that path: move with `git-mv`, update runner config and globs so they still run (Node's `**` glob skips dot directories; add explicit globs), then bring them up to the Unit rules. Report each move and change.
- Cases that need real I/O (git, fs, spawned process) found in unit files: move them to `tests/integration/` at the mirrored path for `cdk:add-integration-tests`.

## ES module safety

Code this skill writes or touches follows this checklist:

- `node:` import specifiers. `execFileSync` or `spawnSync` with an argument array and a `timeout`; never `shell: true`, `eval`, `new Function`, or input interpolated into a command.
- `JSON.parse` of external input inside `try`, then validate shape and types.
- Resolve paths and check they stay inside the project root before reading or writing.
- Never log secrets or env values; no network calls unless the module's purpose.

## Official docs

- Vitest: <https://vitest.dev/guide/>; coverage <https://vitest.dev/guide/coverage>
- Jest: <https://jestjs.io/docs/getting-started>
- pytest: <https://docs.pytest.org/en/stable/explanation/goodpractices.html>
- Go: <https://pkg.go.dev/testing>
- Rust: <https://doc.rust-lang.org/book/ch11-00-testing.html>
- .NET: <https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices>
- Faker JS: <https://fakerjs.dev/>
