---
name: write-e2e-tests
description: Write end-to-end tests for the repo's stack (whole code base unless the input names paths, journeys, or features). Detects stack, framework, app start command, and critical user journeys through the UI, API, or CLI; every test follows AAA, uses faker values instead of literals, user-facing locators, and no fixed sleeps. Use only when the user explicitly asks to write, add, or implement end-to-end or e2e tests, e.g. "add e2e tests", "write Playwright tests for checkout". Do not use on your own after finishing a task.
argument-hint: '[paths | journeys | feature description]'
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *)
---

# Write E2E Tests

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Follow every rule in `${CLAUDE_SKILL_DIR}/../write-unit-tests/references/conventions.md` Shared rules, Faker libraries, and End to end; each says why.
- User interaction (AskUserQuestion) and writes only here; `cdk:test-gap-analyzer` cannot ask, so its `Questions:` and `Missing:` lines are asked here.
- Writes: test files and test-only config (seed scripts, auth setup); framework and browser installs and configs belong to `cdk:setup-testing`; never production code (conventions.md Shared rules).
- Never run against production or shared environments; only a locally started app or a URL the user confirms is local or safe.
- Caps: step 3 re-spawns an analyzer at most once, still open `Questions:` → `Stopped: 3: analyzer questions unresolved`; step 9 run-fix rounds at most 3, then `Stopped: 9: tests still failing after 3 rounds`.
- Stop answer → print the Output with `Result: cancelled`, `Stopped: <step>: <reason>`, and end. The step 3 cap precedes any test, so print the Output with `Resolution: not run (stopped)`, `Result: stopped`, `Stopped: 3: analyzer questions unresolved`, and end. Any later cap hit or failure → run step 10 (**Resolve findings.**) on what is left, without re-entering the loop, then print the Output with `Result: stopped`, `Stopped: <step>: <reason>`, and end.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/resolve-findings.md` (scope: edit; sources: `Suspected bugs:`, `Baseline failures:`, tests still failing after the round cap).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/known-issues.md` with slug `write-e2e-tests` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Pre-flight.** Project dir = Context → Repo root, else cwd. `git-dir` shows `rebase-merge`, `rebase-apply`, or `MERGE_HEAD` (rebase or merge in progress) → stop (`Stopped: 1: git operation in progress`); the app must start locally in step 4 before any run. From the input extract scope (paths, journeys, or a feature description; absent → `all`, the whole code base). Scope matches nothing → AskUserQuestion with the closest fits.
2. **Packages.** List files with `list-files` (outside git, Glob skipping `node_modules/`, `vendor/`, `.venv/`, build output); find manifests from `${CLAUDE_SKILL_DIR}/../setup-testing/references/stacks.md` Signals. Monorepo → one package per app with a UI, API, or CLI entry point; else the project dir. Limit to packages the scope touches. JS packages: package manager per `${CLAUDE_SKILL_DIR}/../setup-husky/references/package-manager.md` Detect; ambiguous → ask here.
3. **Analyze.** Spawn one `cdk:test-gap-analyzer` per package, all in one message, each with: package path, kind `e2e`, scope, package manager (`n/a` for non-JS), and the paths of stacks.md and `${CLAUDE_SKILL_DIR}/../write-unit-tests/references/conventions.md`. Use its `Runner:`, `Faker:`, and `Conventions:` fields. Ask returned `Questions:`, then re-spawn only those analyzers with the same inputs plus the answers (cap in Rules). `Known issue:` lines → known-issues rule.
4. **Decide.** Per `Missing:` line and per decision with several fitting answers: framework per journey type (conventions.md End to end), how the app starts (framework-managed server from the repo's start command, or an already running URL the user confirms is local or safe), browsers or devices, test data strategy (API seed, seed script), sign-in reuse. Take the Recommended pick for each and report it. App start `unknown` or an already running URL → ask whether it is local or safe; never assume a URL or port. AskUserQuestion only for that. A `Missing:` framework, browsers, or faker line → chain `cdk:setup-testing e2e <package>` per `${CLAUDE_SKILL_DIR}/../build-skill/references/orchestration.md` (it asks, installs, and configures), then re-spawn that package's analyzer once (counts against the step 3 cap); the chain `stopped` or `cancelled` → stop.
5. **Practices.** WebFetch the picked framework's official docs per conventions.md Best practices rule; note framework-specific rules to apply.
6. **Baseline.** Run the existing e2e suite, if any, with the app started per step 4. Failures → note them for the Output and continue without them (not this skill's to fix). Every journey already covered → `Result: nothing-to-do`; with baseline failures, first run step 10 on them without re-entering the loop (else `Resolution: not run (nothing-to-do)`).
7. **Plan.** Table per package: journey, entry `file:line`, steps, assertions, data setup; critical journeys first. Print it and continue to step 8 without asking.
8. **Write.** Per journey, in the project's conventions (style sample) and conventions.md End to end: AAA blocks, seeded faker data created per test, user-facing locators, retrying assertions, independent tests.
9. **Run.** Run the e2e suite with the app started per step 4. Failure in a new test → test, locator, or setup bug: fix it; app behavior looks wrong → conventions.md production-bug rule (keep failing, report). Re-run until every new test passes, except tests kept failing under the production-bug rule (cap in Rules).
10. **Resolve findings.** Per resolve-findings.md. Fix only tests this run wrote. A suspected bug in production code stays `needs-decision`; never delete or weaken a test.
11. **Report** the output below.

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
Baseline failures: <test>, … | none
Suspected bugs: <journey step — kept failing>, … | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
