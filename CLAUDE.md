# cdk — Claude Dev Kit

Claude Code plugin (`name: cdk`). Components live at the repo root: `skills/`, `hooks/hooks.json` (add `agents/`, `.mcp.json` when needed).
Manifest: `.claude-plugin/plugin.json`.

- Git hooks (Husky): `.husky/` — `commit-msg` (commitlint, imperative check, signing config), `post-commit` (signature report).
- Plugin hook: `hooks/scripts/format-lint.mjs` — `PostToolUse` formats then lints each file Claude edits.
- Project hooks (`.claude/settings.json`): `compress-reminder.mjs` asks Claude to run `caveman:caveman-compress` on edited `CLAUDE.md`/`.claude/rules/**`; `task-completed.mjs` gates `TaskCompleted` on `npm run format` + `npm run lint`.

## Commands

- Lint: `npm run lint`
- Format: `npm run format`
- Validate plugin: `claude plugin validate --strict .`
- Evals: `claude plugin eval .` (cheap smoke: `--runs 1 --ablation none --no-publish`)
- Test locally: `claude --plugin-dir .`, then `/reload-plugins` after edits
- Commit message check: `npx commitlint --edit <file>`
- Plugin hook smoke test: `echo '{"tool_input":{"file_path":"<abs>"}}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/format-lint.mjs`

## Rules

Always-on rules: `.claude/rules/principles.md`, `.claude/rules/git.md`.
Component rules load by path: plugin, skills, agents, hooks, MCP, git hooks (see `.claude/rules/`).

## Known issues and fixes

Record each resolved issue here as `- <symptom> → <fix>`; check this list before debugging.

- yamllint `line-length` on long URL comments → put the URL on its own comment line.
- `validate --strict .claude-plugin/plugin.json` warns on root `CLAUDE.md` → accepted; it still loads as repo context, and `validate --strict .` passes.
- `validate --strict` warns on missing marketplace `description` → add top-level `description` to `marketplace.json`.
- prettier silently skips files in `.prettierignore` (exit 0) → route YAML to yamlfmt only.
- Plugin hook blocked edits in projects without an ESLint/Stylelint config → gate those steps on a config file (`configs`).
- hadolint ANSI colors leaked into the hook `reason` → run every hook step with `NO_COLOR=1`.
- ESLint `no-undef` on `process` in `.mjs` → add `globals.node` to `eslint.config.mjs`.
- `caveman doctor claude` shows `degraded`/`drifted` → run `caveman doctor claude --fix`; if it refuses with "MCP entry changed", rewrite `mcpServers.caveman` in `~/.claude.json` in key order `type, command, args, env`.
- Bash prompts in plan mode, deny rules bypassed: `lean-ctx hook rewrite` wraps commands as `lean-ctx -c '…'` → remove that `PreToolUse` hook from `~/.claude/settings.json` (re-check after `lean-ctx doctor`/`update`); use `ctx_shell`.
- Status line `saved:0tok`, proxy log `derived cache epoch prefix diverged` → set `CLAUDE_CODE_ATTRIBUTION_HEADER=0` in `~/.claude/settings.json` `env`.
