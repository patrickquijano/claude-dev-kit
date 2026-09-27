---
name: setup-test-hook
description: Detect the project's tech stack and which unit, integration, e2e, and other tests are feasible, then add a project-scoped Claude Code Stop hook that runs the chosen suites in parallel, fail-fast, after every turn that changed files, and blocks Claude from finishing on any failure, error, or warning so Claude fixes it. The hook reports each suite's start, failure, and completion with its command, and skips suites whose input files are unchanged since they last passed. The hook calls test runners directly, never project scripts. Also note in CLAUDE.md that full suites run in the hook, so Claude runs only targeted tests while working. Use when the user asks to set up, add, or configure a test hook, run tests when Claude finishes or a task completes, or gate completion on tests.
allowed-tools: Bash(git rev-parse *) Bash(node --version) Bash(node --check *) Bash(command -v *)
---

# Setup Test Hook

Input: $ARGUMENTS

## Rules

- Idempotent: check each step's state first and skip what is already done, so re-runs change nothing.
- Commands call runners directly from [stacks.md](stacks.md), never `package.json` scripts, Makefile targets, or other repo scripts, so fail-fast and strict-warning flags stay in the hook.
- `${CLAUDE_SKILL_DIR}/assets/run-tests.mjs` is the canonical hook script (standalone ES module, Node builtins only). Copy it byte for byte except the `GROUPS` and `TIMEOUT` constants, so every project behaves the same.
- Add only feasible suites the user selects; a suite that cannot run blocks every turn.
- Stop fires after every turn, and a block keeps Claude working, so the script skips when the working tree is unchanged since its last run (git fingerprint; outside git, it skips when `stop_hook_active` is true). This keeps Q&A turns free and ends the loop once Claude stops editing.
- Progress: the script logs a line when each suite starts, fails (reason: exit code, warning, timeout, spawn error), completes, is stopped by another failure, or is cached, each naming the suite and its full command. Hook output is not streamed, so lines go live to `.claude/hooks/run-tests.log` (for `tail -f`) and, when the hook ends, to the user as `systemMessage`; a failure also returns `decision: "block"` with the reason for Claude.
- Cache: a suite whose `inputs` files and definition are unchanged since it last passed is skipped, so only suites affected by an edit rerun; any change to an input file invalidates it. Runner-native caches (go test, Gradle) stay on.
- Never overwrite a user file or edit tests without asking.
- Any Stop answer or failure → print the Output with `Stopped: <step>: <reason>` and end.
- Issue → check `## Known issues` first. Fix for a recurring or workflow-blocking issue → append `- <symptom> → <fix>` to source SKILL.md (repo path, not plugin cache); not writable → print line for user.

## Workflow

1. **Preflight.** Project dir = `git rev-parse --show-toplevel`, else cwd. `node --version` fails → stop ("install Node.js; the hook script runs on Node"). Not a git repo → no change-skip and no cache, so every suite runs on every turn and verifies at most one fix round. `git rev-parse HEAD` fails (no commit) → no change-skip, but the per-suite cache still applies. AskUserQuestion: Stop and init git / make a first commit (Recommended; enables the skip) | Continue anyway.
2. **Stack.** Read manifests, lockfiles, and configs listed in [stacks.md](stacks.md). Monorepo (workspaces, `go.work`, Cargo workspace, several manifests) → detect per package; each package's suite sets `cwd` to that package.
3. **Feasibility.** For each kind (unit, integration, e2e, other) decide feasible or not with a one-line reason, per the stacks.md feasibility rule. Probe tools with `command -v`; never install anything.
4. **Existing hook.** Read `hooks.Stop` and legacy `hooks.TaskCompleted` in `.claude/settings.json`, `.claude/settings.local.json`, and `~/.claude/settings.json`, plus any script those hooks run. Name the file each found hook lives in. A Stop hook already runs tests → AskUserQuestion: Keep existing (Recommended; already gates completion) | Replace it | Add alongside. Keep → stop. Only a `TaskCompleted` hook runs tests → AskUserQuestion: Migrate to Stop (Recommended; TaskCompleted fires only when a task-list task completes, so most turns go untested) | Keep it and add Stop | Keep existing. Keep existing → stop.
5. **Select.** Print the feasibility table (kind, runner, command, feasible, reason). No feasible suite → stop. AskUserQuestion, multiSelect, one option per feasible suite; mark all feasible (Recommended) with the reason in each description.
6. **Groups.** Split selected suites into `GROUPS` per stacks.md Parallel safety: group 1 runs in parallel, later groups run one after another.
7. **Commands.** Build each suite as `{ name, cmd, args, cwd?, env?, warn?, inputs? }` from stacks.md: exec prefix for the detected package manager or interpreter, fail-fast flag, strict-warning flag, else `warn` RegExp, and `inputs` from stacks.md Cache inputs. `cmd` is the binary and `args` a string array; never a shell string. Suite names are unique; the cache is keyed by name.
8. **Script.** Hook timeout: an existing entry for this command has a `timeout` → show it as the current value. AskUserQuestion: 10 minutes (Recommended; the Claude Code default for command hooks, enough for most unit and type-check suites) | 30 minutes (long integration or e2e suites) | Other (seconds). The hook blocks Claude for up to this long after each changed turn, so pick the smallest that fits the slowest group. Budget `TIMEOUT` = timeout − 60 s, in ms (600 s → `540_000`). Target `.claude/hooks/run-tests.mjs`. Build it from the asset with `GROUPS` and `TIMEOUT` replaced. Absent → write; identical → skip; differs → show the diff, AskUserQuestion: Keep existing (Recommended; user-edited) | Overwrite. Run `node --check` on it.
9. **Settings.** Create `.claude/settings.json` as `{}` if missing. Append to `hooks.Stop` (create the array) the entry `{ "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/run-tests.mjs\"", "timeout": <chosen seconds>, "statusMessage": "Running tests (tail -f .claude/hooks/run-tests.log)" }] }`, unless an entry with that command exists; an existing entry with another `timeout` or `statusMessage` → update those two fields. Replace or Migrate chosen in step 4 → remove only the old test hook entry, in the file it lives in (the `TaskCompleted` array too when it ends up empty); old entry in `~/.claude/settings.json` → ask first (it applies to every project). The old entry ran a script in the project that nothing else runs → AskUserQuestion: Delete it (Recommended; orphaned) | Keep. Keep every other key and hook. The script's own budget (`TIMEOUT`, 60 s less) stays below `timeout`, so the script reports the timeout itself. Git project and `.gitignore` lacks `.claude/hooks/run-tests.log` → append it (a generated log).
10. **Project context.** The hook owns full runs, so Claude should run only targeted tests while working instead of repeating full suites. Note, in plain prose: "Full test suites (<suite names>) run in the Stop hook (`.claude/hooks/run-tests.mjs`) after each turn that changed files, and block Claude from finishing on any failure or warning. While working, run only the tests for the changed code; never run a full test suite by hand. Targeted commands:" then one line per test suite with its real `cmd` and `args`, prefixed with `cd <cwd> &&` and its `env` vars when set, and the stacks.md Targeted runs argument as a placeholder (for example `npx --no-install vitest run --bail=1 <test file>`). Leave out suites with no targeted form (type checks); they may run whole. Target: first heading matching /test/i in `CLAUDE.md` or `.claude/CLAUDE.md`, else in `.claude/rules/*.md` (first match by file name) → put the note under it; none → append `## Testing` with the note to `CLAUDE.md`, creating it if missing. Check first: a note naming `run-tests.mjs` with the same text → skip, no prompt. Else show the text and target (a different old note is replaced, not duplicated), AskUserQuestion: Add (Recommended; stops Claude re-running full suites) | Skip.
11. **Smoke test.** From the project dir run `echo '{"hook_event_name":"Stop","stop_hook_active":false}' | CDK_RUN_TESTS_FORCE=1 node .claude/hooks/run-tests.mjs` with Bash `run_in_background: true` and wait for it to finish; suites may run up to the budget, which can pass the Bash 10-minute `timeout` limit. The env var forces every suite past the change check and cache. Exit 0 with stdout JSON: no `decision` → pass; `decision: "block"` → the hook works and a suite fails now; report the first `reason` line and ask before fixing tests. Other exit or non-JSON stdout → script error; fix and re-run. Git project → note `git status --porcelain` before and after this run; new entries are files the suites write, so report them and suggest ignoring them in `.gitignore`. Then, in a git project with a commit, run the command without `CDK_RUN_TESTS_FORCE`: it must exit 0 at once with no output (unchanged tree skipped). Outside git, run it with `"stop_hook_active":true` instead; same expectation.
12. **Report** the output below.

## Output

```text
Stack: <languages / frameworks>
Feasible: unit <runner|no: reason>, integration <…>, e2e <…>, other <…>
Selected: <suite names>
Groups: 1 [<parallel suites>] → 2 [<suite>] …
Timeout: <seconds> (script budget <seconds − 60>)
Cache: <suite>: <inputs>, …
Existing hook: none | kept | replaced | added alongside | migrated | kept TaskCompleted + added
Script: .claude/hooks/run-tests.mjs (<written | same | kept>)
Settings: .claude/settings.json (<added | updated | already present>)[, removed old entry from <file>]
Context: <file> (<added | updated | already present | skipped>)
Smoke test: pass | blocks: <first reason line>
Stopped: <step>: <reason>   # only when stopped
```

## Known issues

- none
