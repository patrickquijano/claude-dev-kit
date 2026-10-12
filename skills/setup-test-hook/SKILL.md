---
name: setup-test-hook
description: Add a project Stop hook that runs every feasible unit test suite fail-fast, reruns only suites whose inputs changed, and blocks Claude on any failure, error, or warning. Also note every suite's command in the project context (Claude runs only targeted unit tests) and add VS Code test tasks. Use only when the user explicitly asks to set up a test hook or gate completion on tests, or when cdk:setup-project chains it. Do not use on your own after finishing a task.
argument-hint: '[optional package paths]'
allowed-tools: Bash(git rev-parse *) Bash(git check-ignore *) Bash(git status *) Bash(node --version) Bash(node --check *) Bash(command -v *)
---

# Setup Test Hook

Input: $ARGUMENTS

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Idempotent: check each step's state first and skip what is already done, so re-runs change nothing.
- Commands call runners directly from `${CLAUDE_SKILL_DIR}/references/stacks.md`, never `package.json` scripts, Makefile targets, or other repo scripts, so fail-fast and strict-warning flags stay in the hook.
- `${CLAUDE_SKILL_DIR}/assets/run-tests.mjs` is the canonical hook script (standalone ES module, Node builtins only). Copy it byte for byte except the `GROUPS` and `TIMEOUT` constants, so every project behaves the same.
- The hook runs unit suites only: integration, e2e, and other suites are slow or need services, and a Stop hook would run them after every changed turn. Those suites go only into the project-context note and VS Code tasks, for the user to run.
- Add only feasible unit suites; a suite that cannot run blocks every turn.
- Stop fires after every turn, and a block keeps Claude working, so the script skips when no file in any suite's `inputs` changed since its last run (git fingerprint over those inputs only; outside git, it skips when `stop_hook_active` is true). This keeps Q&A and unrelated edits free and ends the loop once Claude stops editing.
- Progress: the script logs a line when each suite starts, fails (reason: exit code, warning, timeout, spawn error), completes, is stopped by another failure, or is cached, each naming the suite and its full command. Hook output is not streamed, so lines go live to `.claude/hooks/run-tests.log` (for `tail -f`) and, when the hook ends, to the user as `systemMessage`; a failure also returns `decision: "block"` with the reason, telling Claude to fix every failure, error, and warning.
- Cache: a suite whose `inputs` files and definition are unchanged since it last passed is skipped, so only suites affected by an edit rerun; any change to an input file invalidates it. Runner-native caches (go test, Gradle) stay on.
- Never overwrite a user file or edit tests.
- User interaction (AskUserQuestion) only here; `cdk:test-suite-analyzer` cannot ask, so its `Questions:` are asked here. At most 4 questions per call, 2–4 options each; recommended option first with its reason.
- Caps: step 3 re-spawns an analyzer at most once; step 12 script-error fix and re-run at most 3 times, then stop. Every question is asked once.
- Shapes and texts for steps 9–12: `${CLAUDE_SKILL_DIR}/references/hook-files.md`. Package manager detection: `${CLAUDE_SKILL_DIR}/../setup-husky/references/package-manager.md`.
- Chained by `cdk:setup-project` via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Pre-flight stops (step 1) and Stop answers (cancels) → print the Output with `Resolution: not run (stopped | cancelled)`, `Stopped: <step>: <reason>`, and end. Any later failure or cap → run step 13 (**Resolve findings.**) on what is left, without re-entering the loop, then print the Output with `Stopped: <step>: <reason>`.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/resolve-findings.md` (scope: edit; sources: `Smoke test: blocks`, `Feasible unit: no` reasons, `Existing hook: kept`, feasible suites left unselected).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/known-issues.md` with slug `setup-test-hook` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Pre-flight.** Project dir = `repo-root`, else cwd. `node-version` fails → stop ("install Node.js; the hook script runs on Node"). Not a git repo → continue, and warn in the Output: no change-skip and no cache, so every unit suite runs on every turn and verifies at most one fix round; run `/cdk:setup-git` to enable the skip.
2. **Packages.** Find every package: manifests from `${CLAUDE_SKILL_DIR}/references/stacks.md` Signals at the project dir and below (skip `node_modules/`, `vendor/`, `.venv/`, build output). Monorepo (workspaces, `go.work`, Cargo workspace, several manifests) → one package each; else the project dir. Input names package paths → limit to those. JS packages: package manager per package-manager.md Detect; ambiguous → ask here.
3. **Analyze.** Spawn one `cdk:test-suite-analyzer` per package, all in one message, each with the package path, its package manager (`n/a` for non-JS), and the path `${CLAUDE_SKILL_DIR}/references/stacks.md`. Ask the user any returned `Questions:`, then re-spawn only those analyzers with the answers (once). `Known issue:` lines → known-issues rule.
4. **Suites.** Merge every analyzer's suites (all kinds) with their command objects, feasibility, parallel hint, and targeted argument. Names unique across packages (the cache is keyed by name): on a clash prefix the package dir. Every detected suite feeds steps 6, 10, and 11; only feasible unit suites can enter the hook.
5. **Existing hook.** Read `hooks.Stop` and legacy `hooks.TaskCompleted` in the settings files; a Stop hook that already runs tests → keep it, report it, and skip steps 6–9 and 12. Only `TaskCompleted` → ask whether to migrate. Detail: `${CLAUDE_SKILL_DIR}/references/existing-hook.md`.
6. **Select.** Print the feasibility table (kind, runner, command, feasible, reason) for every detected suite. No feasible unit suite → skip steps 7–9 and 12. Else select every feasible unit suite, no question.
7. **Groups.** Split the selected unit suites into `GROUPS` by the analyzer parallel hint (stacks.md Parallel safety): `parallel` → group 1, which runs in parallel; each `serial` suite → its own later group, run one after another.
8. **Script.** Build `.claude/hooks/run-tests.mjs` from the asset with `GROUPS` and `TIMEOUT` replaced (hook timeout 180 s unless an existing entry is higher; `TIMEOUT` = timeout − 60 s); absent → write, identical → skip, differs → keep it. Run `node-check` on it. Detail: `${CLAUDE_SKILL_DIR}/references/script.md`.
9. **Settings.** Append the hook-files.md settings entry to `hooks.Stop` in `.claude/settings.json` unless one with that command exists (then update its `timeout` and `statusMessage`); a Migrate choice removes only the old test hook entry. Append `.claude/hooks/run-tests.log` to `.gitignore` in a git project. Detail: `${CLAUDE_SKILL_DIR}/references/settings.md`.
10. **Project context.** Build the hook-files.md project-context note and add it under the first test-related heading of `CLAUDE.md` (or `.claude/rules/*.md`), else append `## Testing`; a same-text note → skip. Rewriting existing lines asks. Detail: `${CLAUDE_SKILL_DIR}/references/context.md`.
11. **VS Code tasks.** Target `.vscode/tasks.json`; add one hook-files.md task per detected suite that lacks one, keeping every other task and key (JSONC → insert with Edit). Nothing to add → skip; no question. Detail: `${CLAUDE_SKILL_DIR}/references/tasks.md`.
12. **Smoke test.** Run the hook-files.md forced run with Bash `run_in_background: true` and wait for it; a block → report the first `reason` line and ask before fixing tests. Then run the hook-files.md skip check; it must exit 0 at once with no output. Detail: `${CLAUDE_SKILL_DIR}/references/smoke-test.md`.
13. **Resolve findings.** Per resolve-findings.md. Fix only the hook script, settings entry, context note, and tasks this run wrote; a failing test in user code is a finding to report, never edited here.
14. **Report** the output below.

## Output

```text
Packages: <path (manager)>, …
Git: <yes | no: no change-skip or cache; run /cdk:setup-git>
Stack: <languages / frameworks>
Detected: unit <runner|none>, integration <…>, e2e <…>, other <…>
Feasible unit: <runner|no: reason>
Selected (hook, unit only): <suite names>
Groups: 1 [<parallel suites>] → 2 [<suite>] …
Timeout: <seconds> (script budget <seconds − 60>)
Cache: <suite>: <inputs>, …
Existing hook: none | kept | replaced | added alongside | migrated | kept TaskCompleted + added
Script: .claude/hooks/run-tests.mjs (<written | same | kept>)
Settings: .claude/settings.json (<added | updated | already present>)[, removed old entry from <file>]
Context: <file> (<added | updated | already present | skipped>)
Tasks: .vscode/tasks.json (<added N | already present>)[, unignored]
Smoke test: pass | blocks: <first reason line>
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
