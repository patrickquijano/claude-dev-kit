# cdk — Claude Dev Kit

Claude Code plugin (`name: cdk`): skills, subagents, and hooks for any framework or language.

## Architecture

- Manifest: `.claude-plugin/` — `plugin.json` + `marketplace.json`; components live at repo root.
- Skills: `skills/<name>/SKILL.md` — user-invoked workflows; orchestrator skills spawn subagents and own all user interaction.
- Subagents: `agents/` — read-only workers (analyzers, scorers, MR reviewer) spawned by skills; return results to the skill.
- Plugin hook: `hooks/hooks.json` → `hooks/scripts/format-lint.mjs` — `PostToolUse` format then lint each file Claude edits, in any project.
- Evals: `evals/<case>/` — `prompt.md` + `graders/`, run by `claude plugin eval .` against skills.
- Project Claude config: `.claude/settings.json` hooks — `compress-reminder.mjs` ask Claude run `caveman:caveman-compress` on edited `CLAUDE.md`/`.claude/rules/**`; `task-completed.mjs` gate `TaskCompleted` on `npm run format` + `npm run lint`. Rules `.claude/rules/`.
- Git hooks (Husky): `.husky/` + `.commitlintrc.json` — `commit-msg` (commitlint, imperative check, signing config), `post-commit` (signature report); enforce `.claude/rules/git.md`.
- GitLab: `.gitlab-ci.yml` runs SAST + secret detection only (no lint/validate/eval); MR template `.gitlab/merge_request_templates/Default.md`.

## Commands

- Lint: `npm run lint`
- Format: `npm run format`
- Validate plugin: `claude plugin validate --strict .`
- Evals: `claude plugin eval .` (cheap smoke: `--runs 1 --ablation none --no-publish`)
- Test local: `claude --plugin-dir .`, then `/reload-plugins` after edits
- Commit msg check: `npx commitlint --edit <file>`
- Plugin hook smoke test: `echo '{"tool_input":{"file_path":"<abs>"}}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/format-lint.mjs`

## Precedence

- Order: explicit user request > path-scoped rule > this file > unconditional rules (`principles.md`, `git.md`) > skill defaults.
- Conflict between two instructions → ask user; never resolve silently.
- graphify rules from ancestor `~/CLAUDE.md` do not apply here (no `graphify-out/`).

## Boundaries

- Never force-push. Ask first before `git reset --hard`, deleting branches, or `rm` of tracked files.
- Never commit or push directly to `main`; work on a Conventional Branch.
- Ask first before `git push`, creating or updating a merge request, or posting GitLab comments or approvals.
- Secrets and hook bypass: see `.claude/rules/git.md`.

## Changes

- Change only what the task needs; no unrelated edits or refactors. Atomic commits: `.claude/rules/git.md`.

## Definition of done

- [ ] `npm run format`, then `npm run lint` pass.
- [ ] `claude plugin validate --strict .` passes.
- [ ] Skills or evals changed: `claude plugin eval . --runs 1 --ablation none --no-publish` passes.
- [ ] Each changed component passes the `Verify:` check in its `.claude/rules/` file.

## Maintenance

- Update this file, `.claude/rules/`, and `README.md` skills/agents tables in the same change that adds or alters a component, command, path, or convention.
- Record each resolved issue below as `- <symptom> → <fix>`; check list before debug; reuse same fix for same issue.

## Known issues and fixes

- yamllint `line-length` on long URL comments → URL on own comment line.
- `validate --strict .claude-plugin/plugin.json` warns on root `CLAUDE.md` → accepted; still loads as repo context, `validate --strict .` passes.
- `validate --strict` warns missing marketplace `description` → add top-level `description` to `marketplace.json`.
- prettier silently skip files in `.prettierignore` (exit 0) → route YAML to yamlfmt only.
- Plugin hook blocked edits in projects without ESLint/Stylelint config → gate those steps on config file (`configs`).
- hadolint ANSI colors leak into hook `reason` → run every hook step with `NO_COLOR=1`.
- ESLint `no-undef` on `process` in `.mjs` → add `globals.node` to `eslint.config.mjs`.
- `caveman doctor claude` shows `degraded` → run `caveman doctor claude --fix`; if refuses "MCP entry changed", rewrite `mcpServers.caveman` in `~/.claude.json` key order `type, command, args, env`. `drifted` alone (byte hash) harmless.
- `claude:degraded` returns, `--fix` refuses "Caveman hook changed after enable": lean-ctx MCP startup re-sorts all `~/.claude/settings.json` keys; caveman compares hooks key-order-sensitive → set `LEAN_CTX_HEADLESS=1` in `mcpServers["lean-ctx"].env` (`~/.claude.json`), then rewrite caveman hook entries in `settings.json` key order `type, command, timeout`.
- Bash prompts in plan mode, deny rules bypassed: `lean-ctx hook rewrite` wraps commands as `lean-ctx -c '…'` → remove that `PreToolUse` hook from `~/.claude/settings.json`; `LEAN_CTX_HEADLESS=1` stops lean-ctx startup re-adding; use `ctx_shell`.
- `npm run format` renumbers nested list under 2-digit ordered step (steps restart at 1) → keep steps ≥10 as single paragraphs.
- Status line `saved:0tok`, proxy log `derived cache epoch prefix diverged` → set `CLAUDE_CODE_ATTRIBUTION_HEADER=0` in `~/.claude/settings.json` `env`.
