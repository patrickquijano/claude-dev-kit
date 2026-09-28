---
name: setup-test-hook
description: Add a project Stop hook that runs the chosen unit test suites fail-fast, reruns only suites whose inputs changed, and blocks Claude on any failure, error, or warning. Also note every suite's command in the project context (Claude runs only targeted unit tests) and add VS Code test tasks. Use to set up a test hook or gate completion on tests.
disable-model-invocation: true
allowed-tools: Bash(git rev-parse *) Bash(git check-ignore *) Bash(node --version) Bash(node --check *) Bash(command -v *)
---

# Setup Test Hook

Input: $ARGUMENTS

## Rules

- Idempotent: check each step's state first and skip what is already done, so re-runs change nothing.
- Commands call runners directly from [stacks.md](stacks.md), never `package.json` scripts, Makefile targets, or other repo scripts, so fail-fast and strict-warning flags stay in the hook.
- `${CLAUDE_SKILL_DIR}/assets/run-tests.mjs` is the canonical hook script (standalone ES module, Node builtins only). Copy it byte for byte except the `GROUPS` and `TIMEOUT` constants, so every project behaves the same.
- The hook runs unit suites only: integration, e2e, and other suites are slow or need services, and a Stop hook would run them after every changed turn. Those suites go only into the project-context note and VS Code tasks, for the user to run.
- Add only feasible unit suites the user selects; a suite that cannot run blocks every turn.
- Stop fires after every turn, and a block keeps Claude working, so the script skips when no file in any suite's `inputs` changed since its last run (git fingerprint over those inputs only; outside git, it skips when `stop_hook_active` is true). This keeps Q&A and unrelated edits free and ends the loop once Claude stops editing.
- Progress: the script logs a line when each suite starts, fails (reason: exit code, warning, timeout, spawn error), completes, is stopped by another failure, or is cached, each naming the suite and its full command. Hook output is not streamed, so lines go live to `.claude/hooks/run-tests.log` (for `tail -f`) and, when the hook ends, to the user as `systemMessage`; a failure also returns `decision: "block"` with the reason, telling Claude to fix every failure, error, and warning.
- Cache: a suite whose `inputs` files and definition are unchanged since it last passed is skipped, so only suites affected by an edit rerun; any change to an input file invalidates it. Runner-native caches (go test, Gradle) stay on.
- Never overwrite a user file or edit tests without asking.
- Any Stop answer or failure → print the Output with `Stopped: <step>: <reason>` and end.
- Issue → check `## Known issues` first. Fix for a recurring or workflow-blocking issue → append `- <symptom> → <fix>` to source SKILL.md (repo path, not plugin cache); not writable → print line for user.

## Workflow

1. **Preflight.** Project dir = `git rev-parse --show-toplevel`, else cwd. `node --version` fails → stop ("install Node.js; the hook script runs on Node"). Not a git repo → no change-skip and no cache, so every unit suite runs on every turn and verifies at most one fix round. AskUserQuestion: Stop and init git (Recommended; enables the skip) | Continue anyway.
2. **Stack.** Read manifests, lockfiles, and configs listed in [stacks.md](stacks.md). Monorepo (workspaces, `go.work`, Cargo workspace, several manifests) → detect per package; each package's suite sets `cwd` to that package.
3. **Feasibility.** For each kind (unit, integration, e2e, other) list the detected suites and decide feasible or not with a one-line reason, per the stacks.md feasibility rule. Probe tools with `command -v`; never install anything. Every detected suite feeds steps 4, 10, and 11; only feasible unit suites can enter the hook.
4. **Commands.** Build every detected suite (all kinds) as `{ name, cmd, args, cwd?, env?, warn?, inputs? }` from stacks.md: exec prefix for the detected package manager or interpreter, fail-fast flag, strict-warning flag, else `warn` RegExp, and `inputs` from stacks.md Cache inputs. `cmd` is the binary and `args` a string array; never a shell string. Suite names are unique; the cache is keyed by name.
5. **Existing hook.** Read `hooks.Stop` and legacy `hooks.TaskCompleted` in `.claude/settings.json`, `.claude/settings.local.json`, and `~/.claude/settings.json`, plus any script those hooks run. Name the file each found hook lives in. A Stop hook already runs tests → AskUserQuestion: Keep existing (Recommended; already gates completion) | Replace it | Add alongside. Keep → skip steps 6–9 and 12. Only a `TaskCompleted` hook runs tests → AskUserQuestion: Migrate to Stop (Recommended; TaskCompleted fires only when a task-list task completes, so most turns go untested) | Keep it and add Stop | Keep existing. Keep existing → skip steps 6–9 and 12.
6. **Select.** Print the feasibility table (kind, runner, command, feasible, reason) for every detected suite. No feasible unit suite → skip steps 7–9 and 12. Else AskUserQuestion, multiSelect, one option per feasible unit suite; mark all (Recommended) with the reason in each description.
7. **Groups.** Split the selected unit suites into `GROUPS` per stacks.md Parallel safety: group 1 runs in parallel, later groups run one after another.
8. **Script.** Hook timeout: an existing entry for this command has a `timeout` → show it as the current value. AskUserQuestion: 3 minutes (Recommended; fits most unit suites, including runner startup and cold builds) | 10 minutes (large unit suites; the Claude Code default for command hooks) | Other (seconds). The hook blocks Claude for up to this long after each changed turn, so pick the smallest that fits the slowest group. Budget `TIMEOUT` = timeout − 60 s, in ms (180 s → `120_000`). Target `.claude/hooks/run-tests.mjs`. Build it from the asset with `GROUPS` and `TIMEOUT` replaced. Absent → write; identical → skip; differs → show the diff, AskUserQuestion: Keep existing (Recommended; user-edited) | Overwrite. Run `node --check` on it.
9. **Settings.** Create `.claude/settings.json` as `{}` if missing. Append to `hooks.Stop` (create the array) the entry `{ "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/run-tests.mjs\"", "timeout": <chosen seconds>, "statusMessage": "Running unit tests (tail -f .claude/hooks/run-tests.log)" }] }`, unless an entry with that command exists; an existing entry with another `timeout` or `statusMessage` → update those two fields. Replace or Migrate chosen in step 5 → remove only the old test hook entry, in the file it lives in (the `TaskCompleted` array too when it ends up empty); old entry in `~/.claude/settings.json` → ask first (it applies to every project). The old entry ran a script in the project that nothing else runs → AskUserQuestion: Delete it (Recommended; orphaned) | Keep. Keep every other key and hook. The script's own budget (`TIMEOUT`, 60 s less) stays below `timeout`, so the script reports the timeout itself. Git project and `.gitignore` lacks `.claude/hooks/run-tests.log` → append it (a generated log).
10. **Project context.** The hook owns unit runs, so Claude runs only targeted unit tests while working and never the slower suites. Note, in plain prose: "Unit test suites (<suite names>) run in the Stop hook (`.claude/hooks/run-tests.mjs`) after each turn that changed their files, and block Claude from finishing on any failure, error, or warning; fix every one it reports. While working, run only the unit tests for the changed code; never run a full unit suite by hand. Never run integration, e2e, or other test suites; their commands are listed for the user." Then a "Targeted unit tests:" list, one line per unit suite with its real `cmd` and `args`, prefixed with `cd <cwd> &&` and its `env` vars when set, and the stacks.md Targeted runs argument as a placeholder (for example `npx --no-install vitest run --bail=1 <test file>`). Then an "Other suites (user runs them):" list with the full command of each detected integration, e2e, and other suite, plus each unit suite not in the hook (not selected or not feasible), same format; omit the list when there are none. Existing hook kept in step 5 → name its file and command in place of `.claude/hooks/run-tests.mjs`. No unit suite in any hook (step 6 skipped) → drop the hook sentences and state that Claude never runs integration, e2e, or other suites. Target: first heading matching /test/i in `CLAUDE.md` or `.claude/CLAUDE.md`, else in `.claude/rules/*.md` (first match by file name) → put the note under it; none → append `## Testing` with the note to `CLAUDE.md`, creating it if missing. Other context files that tell Claude to run a suite kind now excluded (`AGENTS.md`, `.claude/rules/*.md`, `CLAUDE.md` Commands) → show each line and propose the replacement in the same prompt. Check first: a note with the same text → skip, no prompt. Else show the text and target (a different old note is replaced, not duplicated), AskUserQuestion: Add (Recommended; stops Claude running slow suites) | Skip.
11. **VS Code tasks.** Target `.vscode/tasks.json`. Per detected suite (all kinds) add `{ "label": "test: <suite name>", "type": "shell", "command": <cmd>, "args": <args>, "options": { "cwd": "${workspaceFolder}/<cwd>", "env": <env> }, "group": "test", "problemMatcher": [] }`; drop `options` keys that are unset. `shell` with an `args` array: VS Code quotes each arg, and Windows `.cmd` shims (`npx`, `pnpm`) need a shell. Path-style `cmd` (`./mvnw`, `./gradlew`, `.venv/bin/python`) → add `"windows": { "command": <Windows form> }` (`mvnw.cmd`, `gradlew.bat`, `.venv\Scripts\python.exe`), since tasks do not map `/` to `\`. Skip a suite when a task with that label or the same `command` and `args` exists; keep every other task and key. The file has comments (JSONC) → insert with Edit, never rewrite the file. Nothing to add → skip this step, no prompt. Else show the tasks to add, AskUserQuestion: Add (Recommended; one-click runs for every suite) | Skip. Add → create the file as `{ "version": "2.0.0", "tasks": [] }` if missing, then insert. Add chosen, git project, and `git check-ignore -q .vscode/tasks.json` succeeds → AskUserQuestion: Unignore tasks.json (Recommended; shares the tasks) | Keep local. Unignore → replace a `.vscode/` or `.vscode` line in `.gitignore` with `.vscode/*` and `!.vscode/tasks.json`; ignored by another rule → report it.
12. **Smoke test.** From the project dir run `echo '{"hook_event_name":"Stop","stop_hook_active":false}' | CLAUDE_PROJECT_DIR="<project dir>" CDK_RUN_TESTS_FORCE=1 node .claude/hooks/run-tests.mjs` with Bash `run_in_background: true` and wait for it to finish; suites may run up to the budget, which can pass the Bash 10-minute `timeout` limit. The env var forces every suite past the change check and cache. Exit 0 with stdout JSON: no `decision` → pass; `decision: "block"` → the hook works and a suite fails now; report the first `reason` line and ask before fixing tests. Other exit or non-JSON stdout → script error; fix and re-run. Git project → note `git status --porcelain` before and after this run; new entries are files the suites write, so report them and suggest ignoring them in `.gitignore`. Then, in a git project, run the command without `CDK_RUN_TESTS_FORCE` (keep `CLAUDE_PROJECT_DIR`, so state and cache match the real hook): it must exit 0 at once with no output (unchanged inputs skipped). Outside git, run it with `"stop_hook_active":true` instead; same expectation.
13. **Report** the output below.

## Output

```text
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
Tasks: .vscode/tasks.json (<added N | already present | skipped>)[, unignored]
Smoke test: pass | blocks: <first reason line>
Stopped: <step>: <reason>   # only when stopped
```

## Known issues

- none
