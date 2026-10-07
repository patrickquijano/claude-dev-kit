# Test conventions

Shared by `write-unit-tests`, `write-integration-tests`, `write-e2e-tests`, and their `test-gap-analyzer` agent. Runner detection per stack lives in the sibling skill file `setup-test-hook/stacks.md`; JavaScript package managers in `setup-husky/package-manager.md`. `<x>`, `<py>`, `<mvn>`, `<gradle>` below follow stacks.md.

## Shared rules

- AAA: every test has three blocks in order, Arrange, Act, Assert, split by a blank line or `// Arrange` / `// Act` / `// Assert` comments (the project's comment syntax). One Act per test, so a failure points at one behavior.
- Faker: generate every input with the stack's faker library (table below), never hand-typed literals, so tests do not pass by coincidence of one value. Seed faker once per test file or run (fixed seed, or a logged random seed) so a failure reproduces. Expected values derive from the generated inputs. Literals stay only where the value is the behavior under test: boundaries (`0`, empty string, `null`, max length), enum members, error codes, HTTP status codes.
- Never edit production code. A test that fails because the code looks wrong → report the evidence (input, expected, actual, `file:line`) and keep the failing test, listing the suspected bug in the Output. Tests must never bend to a bug; a test kept failing leaves the pass loops.
- Match the project: existing test location, file naming, runner, assertion style, helpers, and fixtures win over the defaults here. No tests yet → the runner's documented default layout.
- Missing tooling (runner, coverage provider, faker library, e2e framework, browsers, containers) → AskUserQuestion per tool, each option naming its effect ("Install `@faker-js/faker` as dev dependency"): stack-standard option first (Recommended) with its reason, alternatives, Stop. Install only the picked tool, as a dev dependency (package-manager.md Add dev dependency for JS; the stack's own form otherwise). Never install unasked.
- Decisions with more than one fitting answer (runner, mock library, layout, data strategy) → take the Recommended pick, no question, and report each pick with its reason in the Output. Derivable from the repo → use it.
- Best practices: apply the kind's section below, then WebFetch the detected runner's official docs (Official docs list, else the runner's own site from its manifest `homepage`) for runner-specific rules. WebFetch unavailable or failing → bundled sections only; say so in the Output.
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
- No integration in unit tests: no real database, network, filesystem, container, or running server. Such a test belongs to `write-integration-tests`.
- Assert behavior through the public API, not private state or call order, unless the call is the behavior (a sent email).
- Mock only what the unit owns the contract with; prefer fakes and stubs over strict mocks.
- Fast: each test well under a second; slow → a hidden integration.

## Integration

- Scope: two or more real components together, across a boundary the project owns: database repositories, HTTP handlers through the framework, message consumers, file storage, module wiring.
- Dependency per boundary, Recommended pick taken without asking and reported: owned infrastructure (database, cache, queue) → real throwaway service (Testcontainers or `docker compose`) (Recommended; matches production behavior); third-party API → HTTP stub (MSW, WireMock, respx, nock) (Recommended; no live calls, no cost, no flake); in-memory fake → when Docker is unavailable.
- Isolated data: faker-generated unique keys per test; reset by transaction rollback, truncate, or fresh container, so parallel and repeated runs never collide.
- Separate suite from unit: own directory, config, marker, or build tag (stacks.md splits), so unit runs and the unit Stop hook stay fast.
- Assert observable outcomes at the boundary (stored row, HTTP response, published message), not internals.
- Never hit production or shared environments.

## End to end

- Scope: user journeys through the running app from the outside: browser for web UIs, HTTP for APIs, process for CLIs. Pick critical journeys first (sign-up, sign-in, checkout, core CRUD), not every edge; edges belong to unit tests.
- Framework when none exists, Recommended pick taken without asking and reported: web UI → Playwright (Recommended; auto-waiting, parallel, multi-browser, `webServer` starts the app); HTTP API → the existing runner with the stack's HTTP client against the started app (Recommended; no new framework), or Playwright `request`; CLI → the existing runner spawning the built binary as a subprocess (Recommended; tests the real entry point). Existing Cypress, Capybara, or Laravel Dusk setups stay.
- App start: the framework starts it (`webServer`, `start-server-and-test`, compose) from the repo's own start command, or an already running URL the user confirms is local or safe; never assume a URL or port, ask when not derivable.
- Locators: user-facing first (role, label, text), then `data-testid`; never CSS chains or XPath tied to layout.
- Data: create through the app's API or seed step with faker values per test; never depend on pre-existing records.
- Independent tests: fresh context or session per test; reuse sign-in via stored auth state, not test order.
- Web-first assertions that retry (`expect(locator).toBeVisible()`), no sleeps.
- Keep traces, screenshots, or videos on failure only.

## Official docs

- Vitest: <https://vitest.dev/guide/>; coverage <https://vitest.dev/guide/coverage>
- Jest: <https://jestjs.io/docs/getting-started>
- Playwright: <https://playwright.dev/docs/best-practices>
- pytest: <https://docs.pytest.org/en/stable/explanation/goodpractices.html>
- Go: <https://pkg.go.dev/testing>
- Rust: <https://doc.rust-lang.org/book/ch11-00-testing.html>
- .NET: <https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices>
- Testcontainers: <https://testcontainers.com/>
- Faker JS: <https://fakerjs.dev/>
