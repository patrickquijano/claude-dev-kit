# cdk — Claude Dev Kit

Claude Code plugin (`name: cdk`): skills, subagents, and hooks for any framework or language.

## Architecture

- Skills: `skills/<name>/SKILL.md` — user-invoked workflows, with `scripts/`, `references/`, and `assets/` beside it.
- Subagents: `agents/` — read-only workers spawned by skills.
- Plugin hooks: `hooks/hooks.json` → one entry script per event in `hooks/scripts/`, logic in `hooks/scripts/lib/`. Event behavior and error policy: `.claude/rules/hooks.md`.
- Tests: `tests/unit/` and `tests/integration/`. Rules `.claude/rules/tests.md`, `.claude/rules/es-modules.md`.
- Project Claude config: the `.claude/settings.json` `PostToolUse` hook runs `claude plugin validate --strict .` (via `.claude/hooks/post-tool-use.mjs`) after Claude edits a plugin component.
- Git hooks (Husky): `.husky/` + `.commitlintrc.json` enforce `.claude/rules/git.md`. Canonical copies and sync rule: `.claude/rules/git-hooks.md`.
- Release policy: rules `.claude/rules/release.md`.

## Commands

- Validate plugin: `claude plugin validate --strict .`
- Test local: `claude --plugin-dir .`
- Plugin hook smoke test: `echo '{"tool_input":{"file_path":"<abs>"}}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/post-tool-use.mjs`
- SessionStart hook smoke test: `echo '{"source":"startup"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/session-start.mjs` (JSON with a `Today is …` line)
- Prompt hook smoke test: `echo '{"permission_mode":"default","prompt":"Implement X across multiple files\n- a\n- b\n- c"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/user-prompt-submit.mjs` (one JSON with the `AskUserQuestion` plan-mode ask; `echo garbage | …` exits 1 with one stderr line)
- Repo format-lint hook smoke test: `echo '{}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/stop.mjs` (no output when no covered file changed since its last run)
- Validate hook smoke test: `echo '{"tool_input":{"file_path":"'"$PWD"'/.claude-plugin/plugin.json"}}' | CLAUDE_PROJECT_DIR=$PWD node .claude/hooks/post-tool-use.mjs` (exit 0 and no output when valid)

## Precedence

- Order: explicit user request > path-scoped rule > this file > unconditional rules (`principles.md`, `git.md`, `release.md`).
- Trade-off order: correctness > security > clarity > simplicity > maintainability > testability > measured performance.
- Conflict between two instructions → ask user; never resolve silently.
- graphify rules from ancestor `~/CLAUDE.md` do not apply here (no `graphify-out/`).

## Boundaries

- Ask first before `git reset --hard`, deleting branches, or `rm` of tracked files.
- Never commit or push directly to `main`; work on a Conventional Branch.
- Never commit secrets or credentials; read them from env vars.
- Ask first before `git push`, creating a merge request or changing its title, description, branches, or merge options, approving, or merging. Commit only when the user explicitly asks. Review comments, thread replies and resolves, and reviewer requests need no ask; the permission prompt stays the second guard.

## Changes

- Change only what the task needs; no unrelated edits or refactors; one logical change per commit.

## Definition of done

- [ ] `npm run lint` passes.
- [ ] `npm test` passes; new or changed behavior has a test.
- [ ] `npm run audit` passes.
- [ ] Each changed component passes the `Verify:` check in its `.claude/rules/` file.

## Maintenance

- Record a resolved issue in Claude auto memory (`feedback` memory + `MEMORY.md` pointer), never in the repo, only when it recurs or blocks the workflow; check auto memory before debug; reuse same fix for same issue.
