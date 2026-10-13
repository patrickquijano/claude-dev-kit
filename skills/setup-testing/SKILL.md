---
name: setup-testing
description: Set up unit, integration, and end-to-end test tooling per package. Detect the stack and framework, recommend a tester for each kind, install and configure the missing ones in the stack's native folder layout, add run scripts, and note the commands in the project context. Use only when the user explicitly asks to set up testing, test frameworks, or test tooling, or when cdk:setup-project or a write-*-tests skill chains it. Do not use on your own after finishing a task.
argument-hint: '[unit|integration|e2e …] [package paths]'
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(docker info *)
---

# Setup Testing

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags. Package-manager commands come from `${CLAUDE_SKILL_DIR}/../setup-husky/references/package-manager.md`.
- User interaction (AskUserQuestion) and writes only here; `cdk:test-gap-analyzer` cannot ask.
- Input: kind words (`unit`, `integration`, `e2e`) limit the run to those kinds (absent → all three); paths limit it to the packages they touch (absent → every package). The `write-*-tests` skills chain this with one kind and one package.
- Idempotent: a re-run with everything configured changes nothing. Never overwrite an existing config, script, or tester; an existing tester of a kind wins over the recommendation.
- Writes: test config (runner config, markers, build-tag docs, Playwright config), dev-dependency and browser installs per a user pick, run scripts in the manifest, and the context note (plus replacements in other context files the user confirms); never test files beyond an empty-suite placeholder when a runner needs one, and never production code.
- Never install unasked: one AskUserQuestion per missing tool, each option naming its effect ("Install `vitest` as dev dependency"): Recommended first with its reason, alternatives, Stop. At most 4 questions per call.
- Layout: stack-native first, `tests/{unit,integration,e2e}` fallback (`${CLAUDE_SKILL_DIR}/references/layout.md`); integration is always a separate suite.
- Caps: step 2 re-spawns an analyzer at most once, still-open `Questions:` → `Stopped: 2: analyzer questions unresolved`; install and smoke failures stop the skill, no retries.
- Stop answer → print the Output with `Result: cancelled`, `Stopped: <step>: <reason>`, and end. A pre-flight or step 2 stop prints `Resolution: not run (stopped)`. Any later failure → run step 9 (**Resolve findings.**) on what is left, then print the Output with `Result: stopped`, `Stopped: <step>: <reason>`, and end.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/resolve-findings.md` (scope: edit; sources: `Stopped:`, failed smoke runs, skipped installs).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/known-issues.md` with slug `setup-testing` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Pre-flight.** Project dir = Context → Repo root, else cwd. Run `git-dir`; a rebase or merge in progress → stop (`Stopped: 1: git operation in progress`). Find packages, detect the JS package manager, probe Docker. Detail: `${CLAUDE_SKILL_DIR}/references/analyze.md`.
2. **Analyze.** Spawn one `cdk:test-gap-analyzer` per package in one message (kind `setup`); use its `Stack:`, `Testers:`, `Faker:`, `Missing:` lines; ask its `Questions:` only for the selected kinds, then re-spawn those analyzers once with the answers. Detail: `${CLAUDE_SKILL_DIR}/references/analyze.md`.
3. **Decide.** Print a table per package: stack, framework, tester per kind, state (`configured`, `unconfigured`, `missing`). Every selected kind configured and faker present → `Result: nothing-to-do` with `Resolution: not run (nothing-to-do)`, skipping step 9. Else AskUserQuestion per missing tool, per Rules. Detail: `${CLAUDE_SKILL_DIR}/references/decide.md`.
4. **Install.** Picked testers, the faker library (conventions.md Faker libraries), and e2e browsers, as dev dependencies. A failed install stops the skill.
5. **Configure.** Missing configs only, from stacks.md Recommended plus the runner's official docs via WebFetch (unavailable → bundled layout only; say so). Layout and per-kind config per layout.md.
6. **Scripts.** Add `test:unit`, `test:integration`, `test:e2e` (or the stack's equivalent: Make target, Composer script, Gradle task) where missing; unit, integration, and e2e never share one script.
7. **Context note.** Write each kind's command, plus the targeted-run form from stacks.md, under the first heading matching `/test/i` in `CLAUDE.md`, `.claude/CLAUDE.md`, or `.claude/rules/*.md`, else append `## Testing`. Detail: `${CLAUDE_SKILL_DIR}/references/context.md`.
8. **Smoke.** Run each configured suite once with its step 6 script (else the stacks.md command); an empty suite counts as a pass, any other failure stops the skill. Detail: `${CLAUDE_SKILL_DIR}/references/smoke.md`.
9. **Resolve findings.** Per resolve-findings.md; never re-run steps 4–8.
10. **Report** the output below.

## Output

```text
Packages: <path (manager)>, …
Stack: <languages / frameworks>
Testers: <kind — tester — state before → after>, …
Installed: <dev dependencies and browsers | none>, skipped: <tool, …> | none
Configs written: <file>, … | none
Smoke: <kind — pass | empty | fail>, … | not run
Scripts: <name → command>, … | none
Context note: <file: added | replaced | unchanged> | none
Docker: <available | unavailable (fakes)>
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
