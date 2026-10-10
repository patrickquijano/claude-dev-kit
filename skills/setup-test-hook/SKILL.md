---
name: setup-test-hook
description: Add a project Stop hook that runs every feasible unit test suite fail-fast, reruns only suites whose inputs changed, and blocks Claude on any failure, error, or warning. Also note every suite's command in the project context (Claude runs only targeted unit tests) and add VS Code test tasks. Use only when the user explicitly asks to set up a test hook or gate completion on tests, or when cdk:setup-project chains it. Do not use on your own after finishing a task.
argument-hint: '[optional package paths]'
allowed-tools: Bash(git rev-parse *) Bash(git check-ignore *) Bash(git status *) Bash(node --version) Bash(node --check *) Bash(command -v *)
---

# Setup Test Hook

Input: $ARGUMENTS

## Rules

- Idempotent: check each step's state first and skip what is already done, so re-runs change nothing.
- Commands call runners directly from `${CLAUDE_SKILL_DIR}/stacks.md`, never `package.json` scripts, Makefile targets, or other repo scripts, so fail-fast and strict-warning flags stay in the hook.
- `${CLAUDE_SKILL_DIR}/assets/run-tests.mjs` is the canonical hook script (standalone ES module, Node builtins only). Copy it byte for byte except the `GROUPS` and `TIMEOUT` constants, so every project behaves the same.
- The hook runs unit suites only: integration, e2e, and other suites are slow or need services, and a Stop hook would run them after every changed turn. Those suites go only into the project-context note and VS Code tasks, for the user to run.
- Add only feasible unit suites; a suite that cannot run blocks every turn.
- Stop fires after every turn, and a block keeps Claude working, so the script skips when no file in any suite's `inputs` changed since its last run (git fingerprint over those inputs only; outside git, it skips when `stop_hook_active` is true). This keeps Q&A and unrelated edits free and ends the loop once Claude stops editing.
- Progress: the script logs a line when each suite starts, fails (reason: exit code, warning, timeout, spawn error), completes, is stopped by another failure, or is cached, each naming the suite and its full command. Hook output is not streamed, so lines go live to `.claude/hooks/run-tests.log` (for `tail -f`) and, when the hook ends, to the user as `systemMessage`; a failure also returns `decision: "block"` with the reason, telling Claude to fix every failure, error, and warning.
- Cache: a suite whose `inputs` files and definition are unchanged since it last passed is skipped, so only suites affected by an edit rerun; any change to an input file invalidates it. Runner-native caches (go test, Gradle) stay on.
- Never overwrite a user file or edit tests.
- User interaction (AskUserQuestion) only here; `cdk:test-suite-analyzer` cannot ask, so its `Questions:` are asked here. At most 4 questions per call, 2–4 options each; recommended option first with its reason.
- Caps: step 3 re-spawns an analyzer at most once; step 12 script-error fix and re-run at most 3 times, then stop. Every question is asked once.
- Shapes and texts for steps 9–12: `${CLAUDE_SKILL_DIR}/hook-files.md`. Package manager detection: `${CLAUDE_SKILL_DIR}/../setup-husky/package-manager.md`.
- Chained by `cdk:setup-project` via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Any Stop answer or failure → print the Output with `Stopped: <step>: <reason>` and end.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: edit; sources: `Smoke test: blocks`, `Feasible unit: no` reasons, `Existing hook: kept`, feasible suites left unselected).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `setup-test-hook`.

## Workflow

1. **Pre-flight.** Project dir = `git rev-parse --show-toplevel`, else cwd. `node --version` fails → stop ("install Node.js; the hook script runs on Node"). Not a git repo → continue, and warn in the Output: no change-skip and no cache, so every unit suite runs on every turn and verifies at most one fix round; run `/cdk:setup-git` to enable the skip.
2. **Packages.** Find every package: manifests from `${CLAUDE_SKILL_DIR}/stacks.md` Signals at the project dir and below (skip `node_modules/`, `vendor/`, `.venv/`, build output). Monorepo (workspaces, `go.work`, Cargo workspace, several manifests) → one package each; else the project dir. Input names package paths → limit to those. JS packages: package manager per package-manager.md Detect; ambiguous → ask here.
3. **Analyze.** Spawn one `cdk:test-suite-analyzer` per package, all in one message, each with the package path, its package manager (`n/a` for non-JS), and the path `${CLAUDE_SKILL_DIR}/stacks.md`. Ask the user any returned `Questions:`, then re-spawn only those analyzers with the answers (once). `Known issue:` lines → known-issues rule.
4. **Suites.** Merge every analyzer's suites (all kinds) with their command objects, feasibility, parallel hint, and targeted argument. Names unique across packages (the cache is keyed by name): on a clash prefix the package dir. Every detected suite feeds steps 6, 10, and 11; only feasible unit suites can enter the hook.
5. **Existing hook.** Read `hooks.Stop` and legacy `hooks.TaskCompleted` in `.claude/settings.json`, `.claude/settings.local.json`, and `~/.claude/settings.json`, plus any script those hooks run. Name the file each found hook lives in. A Stop hook already runs tests → keep it, report it (file and command), and skip steps 6–9 and 12; no question. Only a `TaskCompleted` hook runs tests → AskUserQuestion: Migrate to Stop (Recommended; TaskCompleted fires only when a task-list task completes, so most turns go untested) | Keep it and add Stop | Keep existing. Keep existing → skip steps 6–9 and 12.
6. **Select.** Print the feasibility table (kind, runner, command, feasible, reason) for every detected suite. No feasible unit suite → skip steps 7–9 and 12. Else select every feasible unit suite, no question.
7. **Groups.** Split the selected unit suites into `GROUPS` by the analyzer parallel hint (stacks.md Parallel safety): `parallel` → group 1, which runs in parallel; each `serial` suite → its own later group, run one after another.
8. **Script.** Hook timeout: an existing entry for this command has a `timeout` above 60 → keep it. Else 180 s (fits most unit suites, including runner startup and cold builds; the hook blocks Claude for up to this long after each changed turn). Budget `TIMEOUT` = timeout − 60 s, in ms (180 s → `120_000`). Target `.claude/hooks/run-tests.mjs`. Build it from the asset with `GROUPS` and `TIMEOUT` replaced. Absent → write; identical → skip; differs → keep the existing file (user-edited), report the diff and how to overwrite (delete it, then rerun), and read its `GROUPS` and `TIMEOUT`; use those suites and that budget in steps 9–13 and the Output, and raise the hook timeout to at least `TIMEOUT` s + 60 when lower, so the script still reports its own timeout. Run `node --check` on it.
9. **Settings.** Create `.claude/settings.json` as `{}` if missing. Append the hook-files.md settings entry to `hooks.Stop` (create the array), unless an entry with that command exists; an existing entry with another `timeout` or `statusMessage` → update those two fields. Migrate chosen in step 5 → remove only the old test hook entry, in the file it lives in (the `TaskCompleted` array too when it ends up empty); old entry in `~/.claude/settings.json` → ask first (it applies to every project). The old entry ran a script in the project that nothing else runs → AskUserQuestion: Delete it (Recommended; orphaned) | Keep. Keep every other key and hook. Git project and `.gitignore` lacks `.claude/hooks/run-tests.log` → append it (a generated log).
10. **Project context.** The hook owns unit runs, so Claude runs only targeted unit tests while working and never the slower suites. Build the hook-files.md project-context note. Target: first heading matching /test/i in `CLAUDE.md` or `.claude/CLAUDE.md`, else in `.claude/rules/*.md` (first match by file name) → put the note under it; none → append `## Testing` with the note to `CLAUDE.md`, creating it if missing. Other context files that tell Claude to run a suite kind now excluded (`AGENTS.md`, `.claude/rules/*.md`, `CLAUDE.md` Commands) → show each line and propose the replacement in the same prompt. A note with the same text → skip. Else add it without asking and report the text and target; a different old note is replaced, not duplicated, and replacing or rewriting existing lines → AskUserQuestion: Rewrite (Recommended; stops Claude running slow suites) | Skip.
11. **VS Code tasks.** Target `.vscode/tasks.json`; one hook-files.md task per detected suite (all kinds). Skip a suite when a task with that label or the same `command` and `args` exists; keep every other task and key. The file has comments (JSONC) → insert with Edit, never rewrite the file. Nothing to add → skip this step. Else add them, no question (one-click runs for every suite). Git project and `git check-ignore -q .vscode/tasks.json` succeeds → write it, keep it ignored, and report how to unignore (replace a `.vscode/` or `.vscode` line in `.gitignore` with `.vscode/*` and `!.vscode/tasks.json`).
12. **Smoke test.** From the project dir run the hook-files.md forced run with Bash `run_in_background: true` and wait for it to finish; suites may run up to the budget, which can pass the Bash 10-minute `timeout` limit. A block → report the first `reason` line and ask before fixing tests. Script error → check the `GROUPS` and `TIMEOUT` edits only (the rest is the canonical asset), fix them, re-run (cap in Rules); still failing → stop, report the error as an asset bug. Script kept in step 8 → report the error, never edit it. Git project → note `git status --porcelain` before and after this run; new entries are files the suites write, so report them and suggest ignoring them in `.gitignore`. Then run the hook-files.md skip check; it must exit 0 at once with no output.
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
Resolution: <n> resolved, <m> open (<id: reason; recommended fix>, …), <k> accepted | none | not run (stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
