# Scopes

Where a hook lives per scope.

| Scope   | Config file                    | Script dir                |
| ------- | ------------------------------ | ------------------------- |
| Plugin  | `<plugin>/hooks/hooks.json`    | `<plugin>/hooks/scripts/` |
| Project | `<repo>/.claude/settings.json` | `<repo>/.claude/hooks/`   |
| User    | `~/.claude/settings.json`      | `~/.claude/hooks/`        |

- Exec-form `args` path per scope is in the first block; `<e>` is the event name in kebab-case; one script per event per scope. Every config has a root `hooks` key.
- Unknown plugin dir → ask; `--yes` → `Result: stopped`, `Stopped: 2: no input`. Print the resolved paths before the write; field names and matchers come from the fetched reference.
- User scope: `~` in `args` only when the fetched reference documents that exec form expands it.

```text
Plugin:  ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/<e>.mjs
Project: ${CLAUDE_PROJECT_DIR}/.claude/hooks/<e>.mjs
User:    <absolute home path>/.claude/hooks/<e>.mjs
```

```json
{
  "hooks": {
    "<Event>": [
      {
        "matcher": "<matcher>",
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/scripts/<e>.mjs"],
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

## Re-check before writing

Run this re-check before the step 9 implement-spec call.

1. The path equals the table row for the recorded scope and stays inside the plugin dir, repo root, or `~/.claude/`.
2. The config parses as JSON (invalid → stop and ask; `--yes` → `Result: stopped`, `Stopped: 8: invalid config`); a missing file is created with only the `hooks` key.
3. An identical handler already present → skip it; nothing existing is removed or reordered.
