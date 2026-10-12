---
name: write-unit-tests
description: Write unit tests until a target coverage is met (default 90%). Every public function gets at least 2 positive and 2 negative AAA cases with faker values. Use only when the user explicitly asks to write unit tests or raise coverage, e.g. "write unit tests for src/auth". Do not use on your own after finishing a task.
argument-hint: '[target coverage %] [paths | feature description]'
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *)
---

# Write Unit Tests

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Follow every rule in `${CLAUDE_SKILL_DIR}/references/conventions.md` Shared rules, Faker libraries, Coverage, and Unit (including ES modules and ES module safety); each says why.
- User interaction (AskUserQuestion) and writes only here; `cdk:test-gap-analyzer` cannot ask, so its `Questions:` and `Missing:` lines are asked here.
- Writes: test files (moved with `git-mv`), test setup files and runner globs, and dev-dependency installs per a user pick only; never production code (conventions.md Shared rules).
- Caps: step 3 re-spawns an analyzer at most once, still open `Questions:` → `Stopped: 3: analyzer questions unresolved`; step 10 fixes one new test at most 2 times, then keeps it failing and reports the suspected bug; step 10 coverage rounds at most 5, then `Stopped: 10: target not met after 5 rounds`.
- Stop answer → print the Output with `Result: cancelled`, `Stopped: <step>: <reason>`, and end. The step 3 cap precedes any test, so print the Output with `Resolution: not run (stopped)`, `Result: stopped`, `Stopped: 3: analyzer questions unresolved`, and end. Any later cap hit or failure → run step 11 (**Resolve findings.**) on what is left, without re-entering the loop, then print the Output with `Result: stopped`, `Stopped: <step>: <reason>`, and end.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/resolve-findings.md` (scope: edit; sources: `Suspected bugs:`, `Uncovered:`, baseline failures reported in step 6, tests still failing after the round cap).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/known-issues.md` with slug `write-unit-tests` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Pre-flight.** Project dir = Context → Repo root, else cwd. From the input extract: target coverage (a percentage; absent → 90%), metric (line, branch, statement, function; absent → line), scope (paths, symbols, or a feature description; absent → `all`, the whole code base). Target outside 1–100 or scope matches no file → AskUserQuestion with the closest fits.
2. **Packages.** List files with `list-files` (outside git, Glob skipping `node_modules/`, `vendor/`, `.venv/`, build output); find manifests from `${CLAUDE_SKILL_DIR}/../setup-test-hook/references/stacks.md` Signals. Monorepo → one package each; else the project dir. Limit to packages the scope touches. JS packages: package manager per `${CLAUDE_SKILL_DIR}/../setup-husky/references/package-manager.md` Detect; ambiguous → ask here.
3. **Analyze.** Spawn one `cdk:test-gap-analyzer` per package, all in one message, each with: package path, kind `unit`, scope, package manager (`n/a` for non-JS), and the paths of stacks.md and `${CLAUDE_SKILL_DIR}/references/conventions.md`. Use its `Runner:`, `Coverage:`, `Faker:`, and `Conventions:` fields. Ask returned `Questions:`, then re-spawn only those analyzers with the same inputs plus the answers (cap in Rules). `Known issue:` lines → known-issues rule.
4. **Practices.** WebFetch the detected runner's official docs per conventions.md Best practices rule; note runner-specific rules to apply.
5. **Decide.** Per `Missing:` line and per decision with several fitting answers (runner, coverage provider, faker library, mock library from `Mocks:`, test location): take conventions.md's Recommended pick and report it; AskUserQuestion only to install a missing tool (at most 4 questions per call). Install picked tools as dev dependencies; install fails → stop.
6. **Baseline.** No existing tests → baseline 0%. Else run each package's coverage command (conventions.md Coverage) and record total and per-file coverage for the metric. Existing tests fail → report them and measure without them (not this skill's to fix); no ask. Baseline ≥ target every target's existing cases are ≥2 positive and ≥2 negative, and the analyzer reports no `Misplaced:` or `Non-conforming:` tests → `Result: nothing-to-do`; with baseline failures, first run step 11 on them without re-entering the loop (else `Resolution: not run (nothing-to-do)`).
7. **Relocate and upgrade.** JS/TS ES modules only, before any new test: use the analyzer's `Misplaced:` and `Non-conforming:` lines. `git-mv` each unit test outside `tests/unit/` to its mirrored path, update runner config and globs, bring it up to the Unit rules (AAA, 2 positive + 2 negative per function, no integration), move I/O-bound cases to `tests/integration/` at the mirrored path for `cdk:write-integration-tests`, and report each change. None found → skip.
8. **Plan.** Table per package: target `file:line`, symbol, planned positive and negative cases, doubles needed; lowest coverage first. Print it and continue to step 9 without asking.
9. **Write.** Per target, in the project's conventions (style sample) and conventions.md Unit: AAA blocks, seeded faker inputs, ≥2 positive and ≥2 negative cases, I/O collaborators doubled.
10. **Measure.** Run new tests with coverage. Failure in a new test → test bug: fix the test; code looks wrong → conventions.md production-bug rule (keep failing, report). Coverage below target → read the uncovered lines report, add cases for those lines, re-run. Repeat until the target is met and every new test passes, except tests kept failing under the production-bug rule (caps in Rules).
11. **Resolve findings.** Per resolve-findings.md. Fix only tests this run wrote. A suspected bug in production code stays `needs-decision` (Rules: report, never edit code to pass a test); never delete or weaken a test.
12. **Report** the output below.

## Output

```text
Packages: <path (manager)>, …
Stack: <languages / frameworks>
Runner: <runner> + coverage <provider>; faker <library>
Installed: <dev dependencies | none>
Scope: <whole code base | paths | feature>
Target: <n>% <metric>
Coverage: <package>: <baseline>% → <final>%, …
Tests: <n files>, <n cases> (<positive> positive, <negative> negative)
Relocated: <from → to>, … | none
Needs refactor: <module — reason>, … | none
Rounds: <n>/5
Practices: bundled + <docs fetched | WebFetch unavailable>
Baseline failures: <test>, … | none
Suspected bugs: <file:line — kept failing>, … | none
Uncovered: <file — n%>, … | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
