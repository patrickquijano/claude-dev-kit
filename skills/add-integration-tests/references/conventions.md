# Integration test conventions

Read by this skill and its `cdk:repo-analyzer` kind `tests`. `<x>`, `<py>`, `<mvn>`, `<gradle>` follow `stacks.md`.

## Contents

- Shared rules · Faker libraries · Integration · ES modules · Best practices · Official docs

## Shared rules

- AAA: every test has three blocks in order, Arrange, Act, Assert, split by a blank line or `// Arrange` / `// Act` / `// Assert` comments (the project's syntax). One Act per test.
- Faker: generate every input with the stack's faker library, never hand-typed literals. Seed once per file or run (fixed seed, or a logged random seed) so failures reproduce. Expected values derive from generated inputs. Literals stay only where the value is the behavior: boundaries (`0`, empty, `null`, max length), enum members, error codes, HTTP statuses.
- Never edit production code. A test that fails because the code looks wrong: report the evidence (input, expected, actual, `file:line`), keep the failing test, list the suspected bug in the Output. Tests never bend to a bug.
- Match the project: existing test location, naming, runner, assertion style, helpers, and fixtures win over defaults. No tests yet → the runner's documented default layout.
- Missing tooling (runner, faker library, containers) → chain `cdk:setup-testing integration <package>`; never install unasked.
- More than one fitting answer (runner, stub library, layout, data strategy) → take the Recommended pick, no question, and report it with its reason. Derivable from the repo → use it.
- Independent and order-free: no test depends on another's state or run order; each cleans up what it creates.
- Names state behavior and condition (`returns 404 when order does not exist`), not the method name alone.
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

## Integration

- Scope: two or more real components together across a boundary the project owns: database repositories, HTTP handlers through the framework, message consumers, file storage, module wiring.
- Dependency per boundary (Recommended pick taken without asking and reported): owned infrastructure (database, cache, queue) → real throwaway service via Testcontainers or `docker compose` (Recommended; matches production behavior); third-party API → HTTP stub such as MSW, WireMock, respx, nock (Recommended; no live calls, cost, or flake); in-memory fake → when Docker is unavailable.
- Isolated data: faker-generated unique keys per test; reset by transaction rollback, truncate, or fresh container, so parallel and repeated runs never collide.
- Separate suite from unit: own directory, config, marker, or build tag (stacks.md), so unit runs stay fast.
- Assert observable outcomes at the boundary (stored row, HTTP response, published message), not internals.
- Never hit production or shared environments.

## ES modules

JS/TS ES modules: integration tests go in `tests/integration/` at the mirrored source path (`src/a/b.mjs` → `tests/integration/src/a/b.test.mjs`), apart from `tests/unit/`. This overrides "match the project" for location only. Each test uses temp dirs it removes afterwards and never touches the network. Code written here: `node:` import specifiers; `execFileSync` or `spawnSync` with an argument array and a `timeout`, never `shell: true`, `eval`, or interpolated input; `JSON.parse` of external input inside `try`; paths resolved and kept inside the project root; no secrets logged.

## Best practices

Apply the Integration section, then WebFetch the detected runner's official docs (list below, else the runner's `homepage` from its manifest) for runner-specific rules; add Testcontainers when a container is picked. WebFetch unavailable or failing → bundled rules only, and say so in the Output.

## Official docs

- Vitest: <https://vitest.dev/guide/>
- Jest: <https://jestjs.io/docs/getting-started>
- pytest: <https://docs.pytest.org/en/stable/explanation/goodpractices.html>
- Go: <https://pkg.go.dev/testing>
- Rust: <https://doc.rust-lang.org/book/ch11-00-testing.html>
- .NET: <https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices>
- Testcontainers: <https://testcontainers.com/>
- Faker JS: <https://fakerjs.dev/>
