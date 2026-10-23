# Conventions

Test rules for `add-e2e-tests` and its `cdk:repo-analyzer` kind `tests`. `<x>` follows `stacks.md`.

## Contents

- Shared rules · Faker libraries · End to end · Official docs

## Shared rules

- AAA: three blocks in order, Arrange, Act, Assert, split by a blank line or `// Arrange` / `// Act` / `// Assert` comments (the project's comment syntax). One Act per test, so a failure points at one behavior.
- Faker: generate every input with the stack's faker library, never hand-typed literals. Seed once per file or run (fixed seed, or a logged random seed) so a failure reproduces. Expected values derive from the generated inputs. Literals stay only where the value is the behavior: boundaries, enum members, error codes, HTTP status codes.
- Never edit production code. A test that fails because the code looks wrong: report the evidence (input, expected, actual, `file:line`) and keep the failing test; tests never bend to a bug.
- Match the project: existing test location, naming, runner, assertion style, helpers, and fixtures win over these defaults. No tests yet → the runner's documented default layout.
- Missing tooling (e2e framework, browsers, faker library) → chain `cdk:setup-testing e2e <package>`. Never install unasked.
- Several fitting answers (framework, data strategy, layout) → take the Recommended pick, no question, and report it with its reason.
- Independent and order-free: no test depends on another's state or run order; each cleans up what it creates.
- Names state behavior and condition (`shows an error when the password is wrong`), not the page name alone.
- No fixed sleeps; wait on a condition.
- No secrets in tests; read real credentials from env vars and keep them out of fixtures and snapshots.
- Best practices: apply End to end below, then use the practices researcher's cited rules from the picked framework's official docs (Official docs list, else the site named in its manifest `homepage`). Researcher unavailable → bundled rules only; say so in the Output.

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

## End to end

- Scope: user journeys through the running app from the outside: browser for web UIs, HTTP for APIs, process for CLIs. Critical journeys first (sign-up, sign-in, checkout, core CRUD); edges belong to unit tests.
- Framework when none exists (Recommended, taken without asking and reported): web UI → Playwright (auto-waiting, parallel, multi-browser, `webServer` starts the app); HTTP API → the existing runner with the stack's HTTP client against the started app, or Playwright `request`; CLI → the existing runner spawning the built binary as a subprocess. Existing Cypress, Capybara, or Laravel Dusk setups stay.
- App start: the framework starts it (`webServer`, `start-server-and-test`, compose) from the repo's own start command, or an already running URL the user confirms is local or safe; never assume a URL or port.
- Locators: user-facing first (role, label, text), then `data-testid`; never CSS chains or XPath tied to layout.
- Data: create through the app's API or a seed step with faker values per test; never depend on pre-existing records.
- Independent tests: fresh context or session per test; reuse sign-in through stored auth state, not test order.
- Web-first assertions that retry (`expect(locator).toBeVisible()`), no sleeps.
- Keep traces, screenshots, or videos on failure only.

## Official docs

- Playwright: <https://playwright.dev/docs/best-practices>
- Cypress: <https://docs.cypress.io/app/core-concepts/best-practices>
- Vitest: <https://vitest.dev/guide/>
- Jest: <https://jestjs.io/docs/getting-started>
- pytest: <https://docs.pytest.org/en/stable/explanation/goodpractices.html>
- Go: <https://pkg.go.dev/testing>
- Rust: <https://doc.rust-lang.org/book/ch11-00-testing.html>
- .NET: <https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices>
- Faker JS: <https://fakerjs.dev/>
