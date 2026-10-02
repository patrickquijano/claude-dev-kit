---
name: write-e2e-tests
description: Write end-to-end tests for the repo's stack (whole code base unless the input names paths, journeys, or features). Detects stack, framework, app start command, and critical user journeys through the UI, API, or CLI; every test follows AAA, uses faker values instead of literals, user-facing locators, and no fixed sleeps. Use only when the user explicitly asks to write, add, or implement end-to-end or e2e tests, e.g. "add e2e tests", "write Playwright tests for checkout". Do not use on your own after finishing a task.
argument-hint: '[paths | journeys | feature description]'
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *)
---

# Write E2E Tests

Input: $ARGUMENTS

## Rules

- Follow every rule in `${CLAUDE_SKILL_DIR}/../write-unit-tests/conventions.md` Shared rules, Faker libraries, and End to end; each says why.
- User interaction (AskUserQuestion) and writes only here; `cdk:test-gap-analyzer` cannot ask, so its `Questions:` and `Missing:` lines are asked here.
- Writes: test files, test-only config (framework config, seed scripts, auth setup), and dev-dependency and browser installs per a user pick only; never production code (conventions.md Shared rules).
- Never run against production or shared environments; only a locally started app or a URL the user confirms is local or safe.
- Caps: step 3 re-spawns an analyzer at most once, still open `Questions:` → `Stopped: 3: analyzer questions unresolved`; step 7 Narrow scope at most 2 times, then only Write tests | Stop; step 9 run-fix rounds at most 3, then `Stopped: 9: tests still failing after 3 rounds`.
- Stop answer → print the Output with `Result: cancelled`, `Stopped: <step>: <reason>`, and end. Cap hit or failure → print the Output with `Result: stopped`, `Stopped: <step>: <reason>`, and end.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `write-e2e-tests`.

## Workflow

1. **Pre-flight.** Project dir = `git rev-parse --show-toplevel`, else cwd. From the input extract scope (paths, journeys, or a feature description; absent → `all`, the whole code base). Scope matches nothing → AskUserQuestion with the closest fits.
2. **Packages.** List files with `git ls-files` (outside git, Glob skipping `node_modules/`, `vendor/`, `.venv/`, build output); find manifests from `${CLAUDE_SKILL_DIR}/../setup-test-hook/stacks.md` Signals. Monorepo → one package per app with a UI, API, or CLI entry point; else the project dir. Limit to packages the scope touches. JS packages: package manager per `${CLAUDE_SKILL_DIR}/../setup-husky/package-manager.md` Detect; ambiguous → ask here.
3. **Analyze.** Spawn one `cdk:test-gap-analyzer` per package, all in one message, each with: package path, kind `e2e`, scope, package manager (`n/a` for non-JS), and the paths of stacks.md and `${CLAUDE_SKILL_DIR}/../write-unit-tests/conventions.md`. Ask returned `Questions:`, then re-spawn only those analyzers with the same inputs plus the answers (cap in Rules). `Known issue:` lines → known-issues rule.
4. **Decide.** Per `Missing:` line and per decision with several fitting answers: framework per journey type (conventions.md End to end), how the app starts (framework-managed server from the repo's start command, or an already running URL the user confirms is local or safe), browsers or devices, test data strategy (API seed, seed script), sign-in reuse. App start `unknown` → ask; never assume a URL or port. AskUserQuestion per conventions.md (at most 4 questions per call). Install picked tools and browsers; install fails → stop.
5. **Practices.** WebFetch the picked framework's official docs per conventions.md Best practices rule; note framework-specific rules to apply.
6. **Baseline.** Run the existing e2e suite, if any, with the app started per step 4. Failures → report them; AskUserQuestion: Continue without them (Recommended; they are not this skill's to fix) | Stop. Every journey already covered → `Result: nothing-to-do`.
7. **Plan.** Table per package: journey, entry `file:line`, steps, assertions, data setup; critical journeys first. AskUserQuestion: Write tests (Recommended) | Narrow scope | Stop. Narrow scope → ask the narrower scope, filter the plan, ask again (cap in Rules).
8. **Write.** Per journey, in the project's conventions (style sample) and conventions.md End to end: AAA blocks, seeded faker data created per test, user-facing locators, retrying assertions, independent tests.
9. **Run.** Run the e2e suite with the app started per step 4. Failure in a new test → test, locator, or setup bug: fix it; app behavior looks wrong → conventions.md production-bug question. Re-run until every new test passes, except tests under a production-bug decision (cap in Rules).
10. **Report** the output below.

## Output

```text
Packages: <path (manager)>, …
Stack: <languages / frameworks>
Framework: <framework> (<browsers | API | CLI>); faker <library>
Installed: <dev dependencies, browsers | none>
Scope: <whole code base | paths | journeys | feature>
App start: <command> at <url> | <url> (running) | n/a (CLI)
Journeys: <journey — n cases>, …
Tests: <n files>, <n cases>; <passing>/<total> pass
Run: <suite command>
Rounds: <n>/3
Practices: bundled + <docs fetched | WebFetch unavailable>
Suspected bugs: <journey step — kept failing | skipped | user fixes>, … | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
