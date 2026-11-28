---
paths:
  - hooks/**
  - .claude/settings.json
  - .claude/hooks/**
---

# Hooks

- `Stop` fires every turn, no matcher; the plugin continues Claude with Stop `hookSpecificOutput.additionalContext` JSON (shown as `Stop hook feedback`, no hook error), not `decision: "block"` or exit 2. Stop `additionalContext` always renders as `Stop hook feedback` and cannot be hidden, so Stop must emit nothing when no covered file changed.
- Plugin hooks never block (no exit 2, no `decision: "block"`), except `SubagentStop` with matcher `cdk:plan-implementer`, which emits `decision: "block"` while the report's `Proof:` is missing or has a nonzero exit, and never when `stop_hook_active` is true.
- Every hook entry script imports the `lib/hook-io.mjs` helpers (`readJsonStdin`, `runIfMain`) instead of copying them; a plugin hook from `/cdk:build-hook` adapts its template to them and is advise-only.
- New or changed handlers register in exec form (`"command": "node"` plus `args`); existing shell-string entries stay until touched.
- Error policy (fail fast): errors bubble to the one boundary per entry script (`runIfMain` in `lib/hook-io.mjs`), which prints one capped `cdk <label>: <message>` line to stderr (`.claude/rules/es-modules.md`). Exit 2 only for the `.claude/hooks/*` gates (`pre-tool-use.mjs`, `post-tool-use.mjs`); `stop` exits 0 and prints a `systemMessage` JSON to stdout instead of stderr (an error notice would show every turn); every other script exits 1. A failed formatter skips its linter; independent groups keep running.
- Verify: pipe sample stdin JSON into script, check exit code + stdout (plugin hook: smoke test in `.claude/CLAUDE.md` Commands).
