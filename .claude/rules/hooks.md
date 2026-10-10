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
- Hooks on the same event run in parallel, so never rely on order between hook entries. Plugin `Stop` work runs in sequence through the single `stop.mjs` dispatcher (format-lint, Graphify, commit; stops at the first block so commit is last); add a Stop step to its `STEPS`, not to `hooks.json`. Consecutive `Stop` blocks are capped (8), so issue each instruction once per working-tree fingerprint and never while `stop_hook_active` follows a reported result. Per-session baselines (tree at session start) live in the SessionStart hook's state file; Stop hooks that sweep the tree compare against it.
- Project `PreToolUse` release hook (`.claude/settings.json` → `hooks/scripts/release-check.mjs hook`): read-only validation of PR/MR creation commands; exit 2 blocks with the fix, never writes, commits, or pushes (`.claude/rules/release.md`).
- Completion gates: prefer `Stop` over `TaskCompleted`; `TaskCompleted` fires only on task-list task complete.
- Exit codes: `0` success, `2` block (stderr to Claude), other = non-blocking error.
- Stdout MUST be single JSON object (exit 0).
- User output: JSON `systemMessage`. Claude feedback: `decision: "block"` + `reason`, or `hookSpecificOutput.additionalContext`.
- `suppressOutput` no effect. `async` hooks can't show `systemMessage` to user.
- Idempotent: same input → same result, no extra side effects.
- Validate + quote all hook input; never `eval`.
- Verify: pipe sample stdin JSON into script, check exit code + stdout (plugin hook: smoke test in `CLAUDE.md` Commands).
- Docs: <https://code.claude.com/docs/en/hooks>
