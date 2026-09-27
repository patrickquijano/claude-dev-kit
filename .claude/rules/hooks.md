---
paths:
  - 'hooks/**'
  - '.claude/settings.json'
  - '.claude/hooks/**'
---

# Hooks

- Define plugin hooks in `hooks/hooks.json` (`{"hooks": {"<Event>": [{"matcher": "...", "hooks": [...]}]}}`).
- Write scripts as `.mjs` run via `node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/<name>.mjs"`; no exec bit needed.
- Project hooks live in `.claude/settings.json`, scripts in `.claude/hooks/*.mjs`, run via `node "$CLAUDE_PROJECT_DIR/.claude/hooks/<name>.mjs"`.
- Use narrow `matcher` patterns; avoid `*` unless required. Match file edits with `Write|Edit`.
- Always set `timeout` (seconds, default 600).
- `if` filters only tool events (`PreToolUse`, `PostToolUse`, …); on other events a hook with `if` never runs.
- `Stop` fires after every turn, has no matcher, and exit 2 keeps Claude working. Gate it on a working-tree fingerprint (skip when unchanged since the last run) so Q&A turns cost nothing and it cannot loop forever; outside git, skip when input `stop_hook_active` is true.
- Prefer `Stop` over `TaskCompleted` for completion gates: `TaskCompleted` fires only when a task-list task completes.
- Exit codes: `0` success, `2` block (stderr shown to Claude), other = non-blocking error.
- Stdout MUST be a single JSON object (on exit 0).
- User-visible output: JSON `systemMessage`. Claude feedback: `decision: "block"` + `reason`, or `hookSpecificOutput.additionalContext`.
- `suppressOutput` has no effect. `async` hooks cannot show `systemMessage` to the user.
- Keep hooks idempotent: re-running on the same input gives the same result and no extra side effects.
- Validate and quote all hook input; never `eval` it.
- Verify: pipe sample stdin JSON into the script and check exit code + stdout (plugin hook: smoke test in `CLAUDE.md` Commands).
- Docs: <https://code.claude.com/docs/en/hooks>
