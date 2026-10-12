# cdk — Claude Dev Kit

Claude Code plugin (`name: cdk`): skills, subagents, and hooks for any framework or language.

## Architecture

- Manifest: `.claude-plugin/` — `plugin.json` + `marketplace.json`; components live at repo root.
- Skills: `skills/<name>/SKILL.md` — user-invoked workflows; orchestrator skills spawn subagents and own all user interaction. `skills/ship-release/` (`/cdk:ship-release`) chains skills to ship a GitHub PR or GitLab MR end to end (branch, atomic commits, release files, PR/MR, review rounds, merge, sync). Shared rule files across skills: list in `.claude/rules/skills.md`.
- Subagents: `agents/` — read-only workers (analyzers, scorers, CR reviewers) spawned by skills (`topic-researcher` is also delegated to directly); return results to the caller. Exceptions: `security-scanner` writes redacted reports under `.vulnerability-reports/` only; `cr-feedback-implementer` edits only the files its group plan names (no Bash); `cr-feedback-validator` runs the repo's documented checks in check mode. None of the `cr-feedback-*` agents get `gh` or git writes.
- Plugin hooks: `hooks/hooks.json` → entry scripts named after their event in `hooks/scripts/`, logic in `hooks/scripts/lib/`: `post-tool-use.mjs` (`PostToolUse`, `lib/format-lint.mjs`: format then lint each file Claude edits; statuses on one `|` line), `stop.mjs` (`Stop`, `lib/format-lint-repo.mjs`: format then lint the whole repo per file-type group whose files changed since its last run; blocks on errors and warnings), `session-start.mjs` (`SessionStart`, `lib/session-start.mjs`: injects today's date and time, plus Graphify usage rules when `graphify` is installed, configured, and `graphify-out/` has all three files), `user-prompt-submit.mjs` (`UserPromptSubmit`, the one dispatcher: runs `lib/plan-mode.mjs` then `lib/task-end.mjs` and merges their context; never blocks). `lib/plan-mode.mjs` asks before `EnterPlanMode` on every prompt; `lib/task-end.mjs` adds the end-of-task steps (canonical detail: `.claude/rules/hooks.md`). Unexpected hook errors bubble to one boundary per entry script (one stderr line; exit 1, or 2 for the `pre-tool-use` gate), expected conditions skip silently. Details: `.claude/rules/hooks.md`. Npx formatters run only when installed or configured. Shared in `lib/`: `hook-io.mjs` (run-as-script guard, stdin, project dir, output objects), `prompt.mjs` (prompt guards), `tools.mjs` (tool table and step runner), `graphify.mjs` (Graphify detection), `git-state.mjs` (git runner, unsafe-state check, temp state files).
- Tests: `tests/unit/` (pure, stubbed `deps`) and `tests/integration/` (real git, fs, spawned CLIs), each mirroring the source path (`hooks/scripts/lib/a.mjs` → `tests/unit/hooks/scripts/lib/a.test.mjs`); every runtime `.mjs` has unit tests (≥2 positive, ≥2 negative per export, AAA). Rules `.claude/rules/tests.md`, `.claude/rules/es-modules.md`.
- Evals: `evals/<case>/` — `prompt.md` + `graders/`, LLM-graded behavioral cases for `claude plugin eval .`; the user runs them by hand, never Claude or a hook.
- Project Claude config: `.claude/settings.json` `PostToolUse` hook → `.claude/hooks/post-tool-use.mjs` — after Claude edits a file under `skills/`, `commands/`, `agents/`, `evals/`, `hooks/`, `.claude-plugin/`, runs structural `claude plugin validate --strict .`; exits 2 on any error or warning so Claude fixes it, and otherwise prints the `/reload-plugins`, `/compact`, or `/reload-skills` reminder for the edited scope (details `.claude/rules/hooks.md`). Rules `.claude/rules/`.
- VS Code tasks: `.vscode/tasks.json` (only tracked file in `.vscode/`) — lint, format, per-tool checks, plugin validate, local branch cleanup.
- Git hooks (Husky): `.husky/` + `.commitlintrc.json` — `commit-msg` (commitlint via detected package manager, imperative check, signing config), `post-commit` (signature report); enforce `.claude/rules/git.md`. Canonical copies in `skills/setup-husky/assets/`; keep identical. `.gitattributes` keeps both LF.
- Release enforcement: opt-in policy `.claude/release-policy.json`; one script `hooks/scripts/lib/release-check.mjs` (tests `tests/{unit,integration}/hooks/scripts/lib/release-check.test.mjs`) shared by the release gate in `prepare-change-request` (`references/release-gate.md`), the project `PreToolUse` hook (`hooks/scripts/pre-tool-use.mjs`) in `.claude/settings.json`, and the required CI check `.github/workflows/release-check.yml`. Rules `.claude/rules/release.md`.
- GitHub release: `skills/create-github-release/` (`SKILL.md`, `references/release-notes.md`); parsing, SemVer, tag-prefix, and notes logic in `hooks/scripts/lib/changelog-release.mjs` (tests `tests/{unit,integration}/hooks/scripts/lib/changelog-release.test.mjs`); one confirmation covers the tag push and release, never force.
- Skill layout (Agent Skills spec): `skills/<name>/SKILL.md` plus `references/` (docs Claude reads; `commands.md` holds every runnable command, referenced by name from a thin SKILL.md; conditional branches in `references/<topic>.md`; `## Context` `` !`cmd || echo '<none>'` `` lines preload fixed git and tool-version reads, rule in `.claude/rules/skills.md`), `assets/` (content copied or filled into output), `scripts/` (executables). Rules `.claude/rules/skills.md`.
- Skill assets: `skills/<name>/assets/` copied into target projects (`setup-husky` hooks and `commit-rules.md`, `setup-test-hook` `run-tests.mjs`, `setup-graphify` `graphify-rules.md`).
- GitHub: PR template `.github/pull_request_template.md`.

## Commands

- Lint: `npm run lint`
- Test: `npm test` (unit then integration); `npm run test:unit`, `npm run test:integration`
- Audit: `npm audit --audit-level=moderate`
- Format: `npm run format`
- Validate plugin: `claude plugin validate --strict .`
- Test local: `claude --plugin-dir .`, then `/reload-plugins` after edits
- Plugin hook smoke test: `echo '{"tool_input":{"file_path":"<abs>"}}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/post-tool-use.mjs`
- SessionStart hook smoke test: `echo '{"source":"startup"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/session-start.mjs` (JSON with `Today is …` line; Graphify rules only when configured)
- Prompt hook smoke test: `echo '{"permission_mode":"default","prompt":"Implement X across multiple files\n- a\n- b\n- c"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/user-prompt-submit.mjs` (one JSON: the `AskUserQuestion` plan-mode step, then the end-of-task steps; `plan` mode + `#noplan` → exit JSON; a question in default mode prints the same ask (Claude picks the recommendation); `echo garbage | …` exits 1 with one stderr line; a `<task-notification>` prompt prints no ask)
- End-of-task smoke test: `echo '{"permission_mode":"default","prompt":"Fix X"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/user-prompt-submit.mjs` (JSON with the docs step, then the commit step; a question, a `/` or `!` prompt, or the ship-release marker prints nothing; Graphify step only when configured)
- Repo format-lint hook smoke test: `echo '{}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/stop.mjs` (no output when no covered file changed since its last run)
- Release hook smoke test: `echo '{"tool_name":"Bash","tool_input":{"command":"gh pr create -B main"}}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/pre-tool-use.mjs` (exit 2 with codes and fixes until the changelog and version are updated and pushed; exit 0 otherwise); validate directly: `node hooks/scripts/lib/release-check.mjs check --target main`
- Validate hook smoke test: `echo '{"tool_input":{"file_path":"'"$PWD"'/skills/build-skill/SKILL.md"}}' | CLAUDE_PROJECT_DIR=$PWD node .claude/hooks/post-tool-use.mjs` (exit 0 and a `systemMessage` JSON naming `/reload-plugins` when valid; no output for paths outside the reload scopes)

## Precedence

- Order: explicit user request > path-scoped rule > this file > unconditional rules (`principles.md`, `git.md`) > skill defaults.
- Conflict between two instructions → ask user; never resolve silently.
- graphify rules from ancestor `~/CLAUDE.md` do not apply here (no `graphify-out/`).

## Boundaries

- Force-push: see `.claude/rules/git.md` `## Push`. Ask first before `git reset --hard`, deleting branches, or `rm` of tracked files.
- Never commit or push directly to `main`; work on a Conventional Branch.
- Ask first before `git push` (an explicit commit or push request to a cdk git skill counts as consent to a normal, non-force push), creating a merge request or changing its title, description, branches, or merge options, approving, or merging. Local commits, review comments, thread replies and resolves, and reviewer requests need no ask; the permission prompt stays the second guard.
- Exception: the end-of-task hook's `cdk:commit-changes` run is consent for its commit and normal push (never force-push, MR, or merge).
- Exception: the release gate in `cdk:prepare-change-request` chains `cdk:commit-changes` (commit and normal push of the changelog and version only) after the user confirms the version bump (always asked, never skipped by `--yes`/`auto`); it never force-pushes and never overrides the check.
- Exception: `/cdk:ship-release` (GitHub or GitLab, by `origin` host) is consent for atomic signed commits, pushing, creating or updating the PR or MR, posting reviews and replies, and merging a clean PR or MR (not draft, conflict-free, required checks passing) with the squash and delete-source choices it asks once (the version bump inside it is still asked, and only because a PR or MR is being created); it continues past blockers and reports them but never bypasses controls, force-pushes, uses `--admin`, or deletes `main`.

## Changes

- Change only what the task needs; no unrelated edits or refactors.

## Definition of done

- [ ] `npm run lint` passes.
- [ ] `npm test` passes; each changed runtime `.mjs` has passing unit tests (and integration tests where `.claude/rules/tests.md` requires them).
- [ ] `npm audit --audit-level=moderate` passes (known upstream `braces` finding via `markdownlint-cli2` excepted until fixed).
- [ ] Each changed component passes the `Verify:` check in its `.claude/rules/` file.

## Maintenance

- Record a resolved issue in Claude auto memory (`feedback` memory + `MEMORY.md` pointer), never in the repo, only when it recurs or blocks the workflow; check auto memory before debug; reuse same fix for same issue.
