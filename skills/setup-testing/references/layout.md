# Layout

Native folder layout per stack, used by `setup-testing` step 5 when it writes a missing config. An existing layout always wins. Paths are relative to the package. Integration stays a separate suite: own directory plus its own config, project, marker, or build tag.

| Stack                      | Unit                                | Integration                                                       | E2E                                               |
| -------------------------- | ----------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| JS/TS ES modules           | `tests/unit/<mirrored src path>`    | `tests/integration/<mirrored src path>`                           | `tests/e2e` (Playwright `testDir`)                |
| JS/TS other (Vitest, Jest) | tests beside source (`*.test.ts`)   | `tests/integration` (Vitest or Jest project)                      | existing `e2e/`, else `tests/e2e`                 |
| Python (pytest)            | `tests/unit`                        | `tests/integration` + marker `integration`                        | `tests/e2e` + marker `e2e`                        |
| Django                     | `<app>/tests/`                      | `<app>/tests/integration/` (own test label)                       | `tests/e2e`                                       |
| Go                         | `*_test.go` beside source           | `*_test.go` with `//go:build integration`                         | `e2e/` with `//go:build e2e`                      |
| Rust                       | `#[cfg(test)]` module in the source | `tests/<name>.rs`                                                 | `tests/e2e.rs`                                    |
| PHP (Laravel)              | `tests/Unit`                        | `tests/Feature`                                                   | `tests/Browser` (Dusk)                            |
| PHP (other)                | `tests/Unit`                        | `tests/Integration`                                               | `tests/E2E`                                       |
| Ruby (RSpec)               | `spec/models`, `spec/lib`           | `spec/requests`                                                   | `spec/system`                                     |
| JVM (Maven)                | `src/test/java` (`*Test`)           | `src/test/java` (`*IT`, Failsafe)                                 | `src/test/java` (`*E2E`, Failsafe `includes` set) |
| JVM (Gradle)               | `src/test`                          | `src/integrationTest` (JVM Test Suite or own source set and task) | `src/e2eTest`                                     |
| Deno                       | `tests/unit`                        | `tests/integration`                                               | `tests/e2e`                                       |
| .NET                       | `<Project>.Tests`                   | `<Project>.IntegrationTests`                                      | `<Project>.E2ETests`                              |

## Fallback

No native layout is documented for the stack or framework → `tests/unit`, `tests/integration`, `tests/e2e` at the package root, mirroring the source path inside each.

## Config per kind

- JS/TS: Vitest `projects` (or `vitest.integration.config.*`) with `include` globs per directory; Jest `projects`; Playwright `playwright.config.*` with `testDir`, a `webServer` block when the repo states a start command, traces on first retry only.
- Python: `[tool.pytest.ini_options]` with `testpaths`, `markers = ["integration: ...", "e2e: ..."]`, and `addopts = "-m 'not integration and not e2e'"` so the default run stays unit.
- Go: build tags only; no config file.
- PHP: `phpunit.xml` test suites `Unit`, `Feature` (and `Browser`).
- JVM: Maven Surefire for `*Test`, Failsafe plugin for `*IT`; Gradle `integrationTest` source set and task.
