---
paths:
  - 'hooks/**'
  - '.claude/settings.json'
  - '.claude/hooks/**'
---

# Hooks

- Reuse the `hook-io.mjs` helpers; do not copy them.
- `Stop` fires every turn, no matcher; the plugin continues Claude with Stop `hookSpecificOutput.additionalContext` JSON (shown as `Stop hook feedback`, no hook error), not `decision: "block"` or exit 2. `UserPromptSubmit` records the tree fingerprint at turn start; the gate fires only when the tree differs from that and from its last fire → Q&A turns, new sessions, and `/clear` stay silent, no infinite loop. Stop `additionalContext` always renders as `Stop hook feedback` and cannot be hidden, so fire less, not quieter; outside git, skip when input `stop_hook_active` true.
- Hooks on the same event run in parallel, so never rely on order between hook entries; parts that need an order go in one dispatcher script.
- Plugin hooks never block (no exit 2, no `decision: "block"`) and name no skill except through the Stop steps.
- Project `PostToolUse` validate hook (`.claude/hooks/post-tool-use.mjs`): hooks cannot run slash commands, so it prints a `systemMessage` naming the reload command; never prints a command twice per run.
- Error policy (fail fast): errors bubble to the one boundary per entry script (`runIfMain` in `lib/hook-io.mjs`), which prints one capped `cdk <label>: <message>` line to stderr (`.claude/rules/es-modules.md`). Exit 2 only for `.claude/hooks/post-tool-use.mjs`; `stop` exits 0 and prints a `systemMessage` JSON to stdout instead of stderr (an error notice would show every turn); every other script exits 1 (`user-prompt-submit` especially: exit 2 would erase the prompt). A failed formatter skips its linter; independent groups keep running.
- Verify: pipe sample stdin JSON into script, check exit code + stdout (plugin hook: smoke test in `.claude/CLAUDE.md` Commands).
