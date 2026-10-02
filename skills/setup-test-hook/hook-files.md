# Hook Files

Shapes and texts that `setup-test-hook` steps 9–12 write or run.

## Settings entry (step 9)

Appended to `hooks.Stop` in `.claude/settings.json`:

```json
{
  "hooks": [
    {
      "type": "command",
      "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/run-tests.mjs\"",
      "timeout": 180,
      "statusMessage": "Running unit tests (tail -f .claude/hooks/run-tests.log)"
    }
  ]
}
```

`timeout` = the step 8 seconds. The script's own budget (`TIMEOUT`, 60 s less) stays below it, so the script reports the timeout itself.

## Project-context note (step 10)

Hook sentences (drop them when no unit suite is in any hook, and state instead that Claude never runs integration, e2e, or other suites):

> Unit test suites (<suite names>) run in the Stop hook (`.claude/hooks/run-tests.mjs`) after each turn that changed their files, and block Claude from finishing on any failure, error, or warning; fix every one it reports. While working, run only the unit tests for the changed code; never run a full unit suite by hand. Never run integration, e2e, or other test suites; their commands are listed for the user.

Then two lists, one line per suite:

- "Targeted unit tests:" each unit suite's real `cmd` and `args`, prefixed with `cd <cwd> &&` and its `env` vars when set, plus the stacks.md Targeted runs argument as a placeholder (for example `npx --no-install vitest run --bail=1 <test file>`).
- "Other suites (user runs them):" the full command of each integration, e2e, and other suite, plus each unit suite not in the hook (not selected or not feasible), same format; omit the list when empty.

Existing hook kept in step 5 → name its file and command in place of `.claude/hooks/run-tests.mjs`.

## VS Code task (step 11)

One per suite, in `.vscode/tasks.json` (created as `{ "version": "2.0.0", "tasks": [] }` when missing):

```json
{
  "label": "test: <suite name>",
  "type": "shell",
  "command": "<cmd>",
  "args": ["<args>"],
  "options": { "cwd": "${workspaceFolder}/<cwd>", "env": {} },
  "group": "test",
  "problemMatcher": []
}
```

- Drop `options` keys that are unset.
- `shell` with an `args` array: VS Code quotes each arg, and Windows `.cmd` shims (`npx`, `pnpm`) need a shell.
- Path-style `cmd` (`./mvnw`, `./gradlew`, `.venv/bin/python`) → add `"windows": { "command": "<Windows form>" }` (`mvnw.cmd`, `gradlew.bat`, `.venv\Scripts\python.exe`), since tasks do not map `/` to `\`.

## Smoke test commands (step 12)

- Forced run (every suite past the change check and cache): `echo '{"hook_event_name":"Stop","stop_hook_active":false}' | CLAUDE_PROJECT_DIR="<project dir>" CDK_RUN_TESTS_FORCE=1 node .claude/hooks/run-tests.mjs`.
- Skip check, git project: the same command without `CDK_RUN_TESTS_FORCE` (keep `CLAUDE_PROJECT_DIR`, so state and cache match the real hook). Outside git: `"stop_hook_active":true` instead. Both must exit 0 at once with no output.
- Results: exit 0 with stdout JSON and no `decision` → pass; `decision: "block"` → the hook works and a suite fails now. Other exit or non-JSON stdout → script error.
