---
paths:
  - 'hooks/**'
  - '.claude/settings.json'
  - '.claude/hooks/**'
---

# Hooks

- Plugin hooks in `hooks/hooks.json` (`{"hooks": {"<Event>": [{"matcher": "...", "hooks": [...]}]}}`).
- Scripts `.mjs`, run via `node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/<name>.mjs"`; no exec bit.
- Project hooks: `.claude/settings.json`, scripts `.claude/hooks/*.mjs`, run via `node "$CLAUDE_PROJECT_DIR/.claude/hooks/<name>.mjs"`.
- Narrow `matcher`; no `*` unless needed. File edits: `Write|Edit`.
- Always set `timeout` (seconds, default 600).
- `if` filters tool events only (`PreToolUse`, `PostToolUse`, …); other events + `if` = never runs.
- `Stop` fires every turn, no matcher, exit 2 = Claude keeps working. Gate on working-tree fingerprint (skip if unchanged since last run) → Q&A turns free, no infinite loop; outside git, skip when input `stop_hook_active` true.
- Completion gates: prefer `Stop` over `TaskCompleted`; `TaskCompleted` fires only on task-list task complete.
- Exit codes: `0` success, `2` block (stderr to Claude), other = non-blocking error.
- Stdout MUST be single JSON object (exit 0).
- User output: JSON `systemMessage`. Claude feedback: `decision: "block"` + `reason`, or `hookSpecificOutput.additionalContext`.
- `suppressOutput` no effect. `async` hooks can't show `systemMessage` to user.
- Idempotent: same input → same result, no extra side effects.
- Validate + quote all hook input; never `eval`.
- Verify: pipe sample stdin JSON into script, check exit code + stdout (plugin hook: smoke test in `CLAUDE.md` Commands).
- Docs: <https://code.claude.com/docs/en/hooks>
