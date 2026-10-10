---
name: write-integration-tests
description: Write integration tests for the repo's stack (whole code base unless the input names paths or features). Detects stack, runner, and the boundaries to cover (database, HTTP handlers, queues, file storage, external APIs); picks per dependency a throwaway container, an HTTP stub, or a fake (recommended defaults); every test follows AAA and uses faker values instead of literals, in a suite kept separate from unit tests. Use only when the user explicitly asks to write, add, or implement integration tests, e.g. "add integration tests", "write integration tests for the orders API". Do not use on your own after finishing a task.
argument-hint: '[paths | feature description]'
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *) Bash(docker info *)
---

# Write Integration Tests

Input: $ARGUMENTS

## Rules

- Follow every rule in `${CLAUDE_SKILL_DIR}/../write-unit-tests/conventions.md` Shared rules, Faker libraries, and Integration; each says why.
- User interaction (AskUserQuestion) and writes only here; `cdk:test-gap-analyzer` cannot ask, so its `Questions:` and `Missing:` lines are asked here.
- Writes: test files, test-only config (suite config, compose file for test services, fixtures), test-only sections of manifests and build files (Jest `projects`, pytest markers, failsafe plugin, `integrationTest` task), and dev-dependency installs per a user pick only; never production code (conventions.md Shared rules).
- Never point tests at production or shared environments; only throwaway services, stubs, or fakes.
- Caps: step 3 re-spawns an analyzer at most once, still open `Questions:` → `Stopped: 3: analyzer questions unresolved`; step 9 run-fix rounds at most 3, then `Stopped: 9: tests still failing after 3 rounds`.
- Stop answer → print the Output with `Result: cancelled`, `Stopped: <step>: <reason>`, and end. The step 3 cap precedes any test, so print the Output with `Resolution: not run (stopped)`, `Result: stopped`, `Stopped: 3: analyzer questions unresolved`, and end. Any later cap hit or failure → run step 10 (**Resolve findings.**) on what is left, without re-entering the loop, then print the Output with `Result: stopped`, `Stopped: <step>: <reason>`, and end.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: edit; sources: `Suspected bugs:`, `Baseline failures:` (including a skipped baseline), tests still failing after the round cap).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `write-integration-tests`.

## Workflow

1. **Pre-flight.** Project dir = `git rev-parse --show-toplevel`, else cwd. From the input extract scope (paths, symbols, or a feature description; absent → `all`, the whole code base). Scope matches no file → AskUserQuestion with the closest fits.
2. **Packages.** List files with `git ls-files` (outside git, Glob skipping `node_modules/`, `vendor/`, `.venv/`, build output); find manifests from `${CLAUDE_SKILL_DIR}/../setup-test-hook/stacks.md` Signals. Monorepo → one package each; else the project dir. Limit to packages the scope touches. JS packages: package manager per `${CLAUDE_SKILL_DIR}/../setup-husky/package-manager.md` Detect; ambiguous → ask here.
3. **Analyze.** Spawn one `cdk:test-gap-analyzer` per package, all in one message, each with: package path, kind `integration`, scope, package manager (`n/a` for non-JS), and the paths of stacks.md and `${CLAUDE_SKILL_DIR}/../write-unit-tests/conventions.md`. Use its `Runner:`, `Faker:`, and `Conventions:` fields. Ask returned `Questions:`, then re-spawn only those analyzers with the same inputs plus the answers (cap in Rules). `Known issue:` lines → known-issues rule.
4. **Decide.** Per `Missing:` line and per decision with several fitting answers: runner and suite split (conventions.md Integration: separate from unit), and per dependency behind a boundary: container | HTTP stub (library from `Mocks:` when present) | fake (conventions.md Integration gives the recommendation and why): take the Recommended pick and report it; AskUserQuestion only to install a missing tool (at most 4 questions per call). Container picked and `docker info` fails → use a fake for it and report it. Install picked tools as dev dependencies; install fails → stop.
5. **Practices.** WebFetch the runner's official docs, plus Testcontainers when a container was picked, per conventions.md Best practices rule; note runner-specific rules to apply.
6. **Baseline.** Existing integration suite → read its config and env first; it targets a non-local host → skip the baseline run (may hit a shared environment) and report `Baseline failures: skipped (non-local host)`. Not skipped → run it. Failures → note them for the Output and continue without them (not this skill's to fix). Every boundary already covered (analyzer Targets `existing:`) → `Result: nothing-to-do`; with baseline failures, first run step 10 on them without re-entering the loop (else `Resolution: none`).
7. **Plan.** Table per package: boundary `file:line`, dependency strategy, scenarios (success and failure paths), data setup and cleanup. Print it and continue to step 8 without asking.
8. **Write.** Per boundary, in the project's conventions (style sample) and conventions.md Integration: AAA blocks, seeded faker data with unique keys, real wiring of the project's own components, the chosen strategy per dependency, cleanup per test.
9. **Run.** Run the integration suite. Failure in a new test → test or setup bug: fix it; code looks wrong → conventions.md production-bug rule (keep failing, report). Re-run until every new test passes, except tests kept failing under the production-bug rule (cap in Rules).
10. **Resolve findings.** Per resolve-findings.md. Fix only tests this run wrote. A suspected bug in production code stays `needs-decision`; never delete or weaken a test.
11. **Report** the output below.

## Output

```text
Packages: <path (manager)>, …
Stack: <languages / frameworks>
Runner: <runner> (<suite split>); faker <library>
Installed: <dev dependencies | none>
Scope: <whole code base | paths | feature>
Dependencies: <dependency — container | stub | fake>, …
Tests: <n files>, <n cases>; <passing>/<total> pass
Run: <suite command>
Rounds: <n>/3
Practices: bundled + <docs fetched | WebFetch unavailable>
Baseline failures: <test>, … | none | skipped (non-local host)
Suspected bugs: <file:line — kept failing>, … | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
