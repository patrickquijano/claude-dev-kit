# cdk — Claude Dev Kit

Claude Code plugin (`name: cdk`): skills, subagents, and hooks for any framework or language.

## Architecture

- Manifest: `.claude-plugin/` — `plugin.json` + `marketplace.json`; components live at repo root.
- Skills: `skills/<name>/SKILL.md` — user-invoked workflows; orchestrator skills spawn subagents and own all user interaction. Shared rule files across skills: list in `.claude/rules/skills.md`.
- Subagents: `agents/` — read-only workers (analyzers, scorers, MR reviewer) spawned by skills; return results to the skill. Exception: `security-scanner` writes redacted reports under `.vulnerability-reports/` only.
- Plugin hooks: `hooks/hooks.json` → `hooks/scripts/glab-read-guard.mjs` (`PreToolUse` Bash, deny a `glab api -X GET` read that also sets another method or body fields, so pre-approved reads never become unprompted writes), `hooks/scripts/format-lint.mjs` (`PostToolUse`, format then lint each file Claude edits) and `format-lint-repo.mjs` (`Stop`, format then lint the whole repo per file-type group whose files changed since its last run; blocks on errors and warnings), in any project. Shared tool table: `hooks/scripts/tools.mjs`.
- Evals: `evals/<case>/` — `prompt.md` + `graders/`, LLM-graded behavioral cases for `claude plugin eval .`; the user runs them by hand, never Claude or a hook.
- Project Claude config: `.claude/settings.json` `PostToolUse` hook → `.claude/hooks/plugin-validate.mjs` — after Claude edits a file under `skills/`, `agents/`, `evals/`, `hooks/`, `.claude-plugin/`, runs structural `claude plugin validate --strict .`; exits 2 on any error or warning so Claude fixes it. Rules `.claude/rules/`.
- VS Code tasks: `.vscode/tasks.json` (only tracked file in `.vscode/`) — lint, format, per-tool checks, plugin validate.
- Git hooks (Husky): `.husky/` + `.commitlintrc.json` — `commit-msg` (commitlint via detected package manager, imperative check, signing config), `post-commit` (signature report); enforce `.claude/rules/git.md`. Canonical copies in `skills/setup-husky/assets/`; keep identical. `.gitattributes` keeps both LF.
- Skill assets: `skills/<name>/assets/` copied into target projects (`setup-husky` hooks, `setup-test-hook` `run-tests.mjs`, `setup-graphify` `graphify-rules.md`).
- GitLab: `.gitlab-ci.yml` runs SAST + secret detection only (no lint/validate/eval); MR template `.gitlab/merge_request_templates/Default.md`.

## Commands

- Lint: `npm run lint`
- Format: `npm run format`
- Validate plugin: `claude plugin validate --strict .`
- Never run `claude plugin eval` (LLM-graded behavioral evals); structural validation only.
- Test local: `claude --plugin-dir .`, then `/reload-plugins` after edits
- Commit msg check: `npx commitlint --edit <file>`
- Plugin hook smoke test: `echo '{"tool_input":{"file_path":"<abs>"}}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/format-lint.mjs`
- glab read guard smoke test: `echo '{"tool_input":{"command":"glab api -X GET projects/:id/merge_requests/1 -X PUT"}}' | node hooks/scripts/glab-read-guard.mjs` (prints `permissionDecision: "deny"`; a plain GET prints nothing)
- Repo format-lint hook smoke test: `echo '{}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/format-lint-repo.mjs` (no output when no covered file changed since its last run)
- Validate hook smoke test: `echo '{"tool_input":{"file_path":"'"$PWD"'/skills/build-skill/SKILL.md"}}' | CLAUDE_PROJECT_DIR=$PWD node .claude/hooks/plugin-validate.mjs` (exit 0 and no output when valid)

## Precedence

- Order: explicit user request > path-scoped rule > this file > unconditional rules (`principles.md`, `git.md`) > skill defaults.
- Conflict between two instructions → ask user; never resolve silently.
- graphify rules from ancestor `~/CLAUDE.md` do not apply here (no `graphify-out/`).

## Boundaries

- Never force-push. Only exception: `cdk:rebase-onto` pushes rewritten history with an explicit lease (`--force-with-lease=<branch>:<pre-rebase sha>`) after explicit confirmation. Ask first before `git reset --hard`, deleting branches, or `rm` of tracked files.
- Never commit or push directly to `main`; work on a Conventional Branch.
- Ask first before `git push` (an explicit commit or push request to a cdk git skill counts as consent to a normal, non-force push), creating a merge request or changing its title, description, branches, or merge options, approving, or merging. Local commits, review comments, thread replies and resolves, and reviewer requests need no ask; the permission prompt stays the second guard.
- Secrets and hook bypass: see `.claude/rules/git.md`.

## Changes

- Change only what the task needs; no unrelated edits or refactors. Atomic commits: `.claude/rules/git.md`.

## Definition of done

- [ ] `npm run format`, then `npm run lint` pass.
- [ ] `claude plugin validate --strict .` passes.
- [ ] The `PostToolUse` validate hook reports no error or warning; fix everything it reports.
- [ ] Each changed component passes the `Verify:` check in its `.claude/rules/` file.

## Maintenance

- Update this file, `.claude/rules/`, and `README.md` skills/agents tables in the same change that adds or alters a component, command, path, or convention.
- Record a resolved issue below as `- <symptom> → <fix>` only when it recurs or blocks the workflow; check list before debug; reuse same fix for same issue.

## Known issues and fixes

- yamllint `line-length` on long URL comments → URL on own comment line.
- `validate --strict .claude-plugin/plugin.json` warns on root `CLAUDE.md` → accepted; still loads as repo context, `validate --strict .` passes.
- `validate --strict` warns missing marketplace `description` → add top-level `description` to `marketplace.json`.
- prettier silently skip files in `.prettierignore` (exit 0) → route YAML to yamlfmt only.
- Plugin hook blocked edits in projects without ESLint/Stylelint config → gate those steps on config file (`configs`).
- hadolint ANSI colors leak into hook `reason` → run every hook step with `NO_COLOR=1`.
- hadolint parse error on heredoc Dockerfiles (`RUN <<EOF`) blocked edits → `format-lint.mjs` skips hadolint when the file has a heredoc.
- ESLint `no-undef` on `process` in `.mjs` → add `globals.node` to `eslint.config.mjs`.
- `npm run format` renumbers nested list under 2-digit ordered step (steps restart at 1) → keep steps ≥10 as single paragraphs.
