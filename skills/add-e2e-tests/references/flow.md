# Flow

Step detail for `add-e2e-tests`. Read the section a step links.

## Contents

- Pre-flight · Packages · Analyze · Decide · Run · Open items

## Pre-flight

- `git-dir` shows `rebase-merge`, `rebase-apply`, or a `MERGE_HEAD` file inside it: stop (`Stopped: 1: git operation in progress`).
- Scope = paths, journeys, or a feature description from the input; absent → `all`, the whole code base.
- Scope matches nothing → AskUserQuestion with the closest fits.

## Packages

- List files with `list-files`; outside git, Glob while skipping `node_modules/`, `vendor/`, `.venv/`, and build output.
- Find manifests from the Signals in `stacks.md`. Monorepo → one package per app with a UI, API, or CLI entry point; else the project dir. Keep only packages the scope touches.
- JS packages: detect the package manager per `stacks.md` Package manager; several lockfiles in one dir → AskUserQuestion (npm Recommended).

## Analyze

Spawn one `cdk:test-gap-analyzer` per package, all in one message. Each receives:

- package path, kind `e2e`, scope, package manager (`n/a` for non-JS);
- the paths `${CLAUDE_SKILL_DIR}/references/stacks.md` and `${CLAUDE_SKILL_DIR}/references/conventions.md`.

Use its `Runner:`, `Faker:`, `Conventions:`, `Style sample:`, `App start:`, and `Targets:` fields. Ask each returned `Questions:` once, then re-spawn only those analyzers with the same input plus the answers. Still open after that → stop (`Stopped: 3: analyzer questions unresolved`) with `Open:` none.

## Decide

For every `Missing:` line and every decision with several fitting answers, take the Recommended pick and report it, without asking:

- framework per journey type (End to end in `conventions.md`), browsers or devices;
- how the app starts: a framework-managed server from the repo's start command, or an already running URL;
- test data strategy (API seed or seed script) and sign-in reuse.

Ask only when `App start:` is `unknown` or the app is an already running URL: is it local or safe? Never assume a URL or port.

A `Missing:` framework, browsers, or faker line → run `cdk:setup-testing e2e <package>` through the Skill tool in this thread (it asks, installs, and configures). Then re-spawn that package's analyzer once; still missing → `Stopped: 4: setup-testing: tester still missing`. The chain returning `stopped` or `cancelled` → stop, relaying its `Stopped:` reason as `Stopped: 4: setup-testing: <reason>`.

## Run

- Start the app per the step 4 decision; run the suite with the runner command and targeted-run form from `stacks.md`.
- A failure in a new test is a test, locator, or setup bug: fix it and rerun until every new test passes, at most 3 rounds (`Rounds: <n>/3`).
- A failure that points at wrong app behavior: keep the test failing, record input, expected, actual, and `file:line` as a suspected bug in `Open:`, and leave it out of later rounds.
- Rounds exhausted → `Stopped: 9: tests still failing after 3 rounds`.

## Open items

- Sources: suspected bugs, baseline failures, tests still failing after the round cap.
- Per item write impact, the smallest recommended fix, and the check that proves it. Fix only tests this run wrote, only when safe and reversible, then rerun that check; at most 2 attempts per item.
- A suspected production bug, a baseline failure, or anything out of scope stays open with its recommended fix and who acts. Attended runs ask one AskUserQuestion for the open choices (recommended first, `Leave open` last); unattended runs ask nothing.
- No source holds an item → `Open: none`. Leftovers never change `Result:`; the caps decide it.
