# Flow details

Conditional branches for steps 3, 5, 6, 10, and 11 of `SKILL.md`.

## Analyze (step 3)

- Spawn one `cdk:repo-analyzer` with `kind: tests` and `model: sonnet` per package, all in one message. Input per agent: package path, test kind `unit`, scope, package manager (`n/a` for non-JS), the path `${CLAUDE_SKILL_DIR}/references/stacks.md`, the path `${CLAUDE_SKILL_DIR}/references/conventions.md`.
- The agent cannot ask. Ask each returned `Questions:` line with AskUserQuestion, then re-spawn only those agents with the same input plus the answers, once. Still open → `Stopped: 3: analyzer questions unresolved`.

## Missing tooling (step 5)

- A `Missing:` runner, coverage provider, or faker line → Skill `cdk:setup-testing` with args `unit <package>` (it asks, installs, configures), then re-spawn that package's analyzer once more (separate from the step 3 re-spawn). Still `Missing:` → `Stopped: 5: tester still missing`.
- The chained skill ends `stopped` or `cancelled` → stop, relaying its `Stopped:` reason as `Stopped: <step>: setup-testing: <reason>`.
- Unit mock library, test location, and similar picks: take Recommended, report.

## Baseline (step 6)

- No existing tests → baseline 0%. Else run each package's coverage command and record total and per-file coverage for the metric.
- Existing tests fail → report them as baseline failures and measure without them; they are not this skill's to fix, no ask.
- Baseline at or above target, every target already has 2 positive and 2 negative cases, and the analyzer reports no `Misplaced:`, `Non-conforming:`, or `Needs refactor:` → `Result: nothing-to-do`.

## Measure loop (step 10)

- Run new tests with coverage. A new test fails → test bug: fix the test, at most 2 fixes per test. Code looks wrong → keep it failing, report as a suspected bug with the evidence.
- Coverage below target → read the uncovered-lines report, add cases for those lines, re-run. At most 5 coverage rounds, then `Stopped: 10: target not met after 5 rounds`.

## Fix leftovers (step 11)

- One capped pass of 1 round over what is left: baseline failures, `Uncovered:` files, tests still failing. Fix only tests this run wrote; never delete or weaken a test.
- A suspected production bug or `Needs refactor:` module stays open with a recommended fix; never edit code to pass a test.
- List what remains in `Open:`.

## Fallbacks

- AskUserQuestion unavailable: take the Recommended option, or stop with `Stopped: <step>: input needed` when none exists; report each pick.
- Write unavailable: stop with `Stopped: 9: cannot write test files`.
- Unattended (chained or hook): ask nothing; take Recommended picks and report them, record what stays unanswerable under `Open:`; with no Recommended pick → `Result: stopped` with `Stopped: <step>: input needed`.
