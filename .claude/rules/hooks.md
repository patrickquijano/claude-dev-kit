---
paths:
  - 'hooks/**'
  - '.claude/settings.json'
  - '.claude/hooks/**'
---

# Hooks

- Define plugin hooks in `hooks/hooks.json` (`{"hooks": {"<Event>": [{"matcher": "...", "hooks": [...]}]}}`).
- Write scripts as `.mjs` run via `node "${CLAUDE_PLUGIN_ROOT}/hooks/<name>.mjs"`; no exec bit needed.
- Project hooks live in `.claude/settings.json`, scripts in `.claude/hooks/*.mjs`, run via `node "$CLAUDE_PROJECT_DIR/.claude/hooks/<name>.mjs"`.
- Use narrow `matcher` patterns; avoid `*` unless required. `MultiEdit` no longer exists: match `Write|Edit`.
- Always set `timeout` (seconds, default 600).
- Exit codes: `0` success, `2` block (stderr shown to Claude), other = non-blocking error.
- Stdout MUST be a single JSON object (on exit 0).
- User-visible output: JSON `systemMessage`. Claude feedback: `decision: "block"` + `reason`, or `hookSpecificOutput.additionalContext`.
- `suppressOutput` has no effect. `async` hooks cannot show `systemMessage` to the user.
- Keep hooks fast and idempotent.
- Validate and quote all hook input; never `eval` it.
- Test by piping sample stdin JSON into the script.
- Docs: <https://code.claude.com/docs/en/hooks>
