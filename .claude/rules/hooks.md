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
- Hooks on the same event run in parallel, so never rely on order between hook entries; the plugin has one `UserPromptSubmit` dispatcher (`user-prompt-submit.mjs`) that runs its parts in order. The plugin `Stop` hook is `format-lint-repo.mjs` alone.
- `/cdk:ship-release` writes the marker `git rev-parse --git-path cdk-ship-release` at pre-flight; `task-end.mjs` leaves out its commit part while it exists, and the skill deletes it once the run ends (merged and synced, or stopped).
- Project `PreToolUse` release hook (`.claude/settings.json` → `hooks/scripts/release-check.mjs hook`): read-only validation of PR/MR creation commands; exit 2 blocks with the fix, never writes, commits, or pushes (`.claude/rules/release.md`).
- Project `PostToolUse` validate hook (`.claude/hooks/plugin-validate.mjs`): hooks cannot run slash commands, so after a valid edit it prints a `systemMessage` naming `/reload-plugins` (plugin `skills|commands|agents|hooks`) and/or `/reload-skills` (project `.claude/` components) plus `additionalContext` to re-read project files; never prints a command twice per run.
- Plugin end-of-task logic (`task-end.mjs`, run by the dispatcher): context only, never blocks, no state; tells Claude to run the Graphify step (when configured) then `cdk:commit-changes` once the whole task is done; each step conditional on `git status --porcelain`; skips question, `/`, and `!` prompts, the ship-release marker, and unsafe git states.
- Plugin plan-mode logic (`plan-mode.mjs`, run by the dispatcher): deterministic rules (`#plan`/`#noplan`, question, change verb + list/length/scope) compare to live `permission_mode`; output is context only (ask the user with `AskUserQuestion`, then `EnterPlanMode` on yes; or `ExitPlanMode`), since no hook output can switch modes; always exit 0, no state.
- Completion gates: prefer `Stop` over `TaskCompleted`; `TaskCompleted` fires only on task-list task complete.
- Exit codes: `0` success, `2` block (stderr to Claude), other = non-blocking error.
- Stdout MUST be single JSON object (exit 0).
- User output: JSON `systemMessage`. Claude feedback: `decision: "block"` + `reason`, or `hookSpecificOutput.additionalContext`.
- `suppressOutput` no effect. `async` hooks can't show `systemMessage` to user.
- Idempotent: same input → same result, no extra side effects.
- Validate + quote all hook input; never `eval`.
- Unit tests per module, integration tests for the stdin→stdout contract: `.claude/rules/tests.md`.
- Verify: pipe sample stdin JSON into script, check exit code + stdout (plugin hook: smoke test in `.claude/CLAUDE.md` Commands).
- Docs: <https://code.claude.com/docs/en/hooks>
