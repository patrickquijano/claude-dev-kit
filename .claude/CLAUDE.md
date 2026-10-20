# cdk — Claude Dev Kit

Claude Code plugin (`name: cdk`): skills, subagents, and hooks for any framework or language.

## Architecture

- Manifest: `.claude-plugin/` — `plugin.json` + `marketplace.json`; components live at repo root.
- Skills: `skills/<name>/SKILL.md` — user-invoked workflows; orchestrator skills spawn subagents and own all user interaction. `skills/ship-release/` (`/cdk:ship-release`) chains skills to ship a GitHub PR or GitLab MR end to end; `skills/debug-issue/`, `skills/implement-requirement/` (offers plan mode first, never commits), and `skills/review-local-changes/` are standalone workflows. `skills/build-skill/` and `skills/build-agent/` draft, run their `scripts/check-*.mjs` (mechanical rules as JSON), and score with `agents/skill-scorer.md` or `agents/agent-scorer.md`, then report and delegate fixes to `agents/skill-improver.md` or `agents/agent-improver.md` for up to 3 rounds. Rules `.claude/rules/skills.md`.
- Subagents: `agents/` — read-only workers (analyzers, scorers, CR reviewers) spawned by skills (`topic-researcher` is also delegated to directly). Exceptions: `security-scanner` writes redacted reports under `.vulnerability-reports/` only; `cr-feedback-implementer` edits only the files its group plan names (no Bash); `cr-feedback-validator` runs the repo's documented checks in check mode; `project-instruction-improver`, `readme-improver`, `skill-improver`, and `agent-improver` edit only the memory files, `README.md`, skill directory, or agent file their skill names (no Bash). Rules `.claude/rules/agents.md`.
- Plugin hooks: `hooks/hooks.json` → one entry script per event in `hooks/scripts/` (`post-tool-use`, `stop`, `session-start`, `pre-tool-use`, `user-prompt-submit`, `.mjs`), logic in `hooks/scripts/lib/`. The `pre-tool-use` dispatcher runs `lib/git-guard.mjs`, then `skills/bump-version/scripts/release-check.mjs`. Event behavior, error policy, and the end-of-task steps: `.claude/rules/hooks.md`.
- Tests: `tests/unit/` (pure, stubbed `deps`) and `tests/integration/` (real git, fs, spawned CLIs), each mirroring the source path. Rules `.claude/rules/tests.md`, `.claude/rules/es-modules.md`.
- Evals: `evals/<case>/` — `prompt.md` + `graders/`, LLM-graded behavioral cases for `claude plugin eval .`; the user runs them by hand, never Claude or a hook (skill-creator evals are separate: `cdk:build-skill` drafts itself and offers optional `skill-creator` evals).
- Project Claude config: `.claude/settings.json` `PostToolUse` hook → `.claude/hooks/post-tool-use.mjs` — after Claude edits a file under `skills/`, `agents/`, `evals/`, `hooks/`, `.claude-plugin/`, runs structural `claude plugin validate --strict .`; exits 2 on any error or warning so Claude fixes it, and otherwise prints the `/reload-plugins`, `/compact`, or `/reload-skills` reminder for the edited scope (details `.claude/rules/hooks.md`). Rules `.claude/rules/`.
- VS Code tasks: `.vscode/tasks.json` (only tracked file in `.vscode/`) — lint, format, per-tool checks, plugin validate, local branch cleanup.
- Git hooks (Husky): `.husky/` + `.commitlintrc.json` enforce `.claude/rules/git.md`. Canonical copies in `skills/setup-husky/assets/`; keep identical. `.gitattributes` keeps both LF.
- Release enforcement: opt-in policy `.claude/release-policy.json`; one script `skills/bump-version/scripts/release-check.mjs` shared by the `prepare-change-request` release gate, the plugin `PreToolUse` hook, and the required CI check `.github/workflows/release-check.yml`. Rules `.claude/rules/release.md`.
- GitHub release: `skills/create-github-release/` (`SKILL.md`, `references/`); parsing, SemVer, tag-prefix, and notes logic in `skills/create-github-release/scripts/changelog-release.mjs` (tests `tests/{unit,integration}/skills/create-github-release/scripts/changelog-release.test.mjs`); one confirmation covers the tag push and release, never force.
- Skill layout (Agent Skills spec): `skills/<name>/SKILL.md` plus `references/` (docs Claude reads; `commands.md` holds every runnable command, referenced by name from a thin SKILL.md; conditional branches in `references/<topic>.md`; `## Context` `` !`cmd || echo '<none>'` `` lines preload fixed git and tool-version reads, rule in `.claude/rules/skills.md`), `assets/` (content copied or filled into output), `scripts/` (executables). Rules `.claude/rules/skills.md`.
- Skill assets: `skills/<name>/assets/` copied into target projects (`setup-husky` hooks and `commit-rules.md`, `setup-graphify` `graphify-rules.md`).
- GitHub: PR template `.github/pull_request_template.md`.

## Commands

- Lint: `npm run lint`
- Test: `npm test` (unit then integration); `npm run test:unit`, `npm run test:integration`
- Audit: `npm audit --audit-level=moderate`
- Format: `npm run format`
- Validate plugin: `claude plugin validate --strict .`
- Test local: `claude --plugin-dir .`, then `/reload-plugins` after edits
- Plugin hook smoke test: `echo '{"tool_input":{"file_path":"<abs>"}}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/post-tool-use.mjs`
- SessionStart hook smoke test: `echo '{"source":"startup"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/session-start.mjs` (JSON with `Today is …` line; a one-line Graphify rules pointer only when configured)
- Prompt hook smoke test: `echo '{"permission_mode":"default","prompt":"Implement X across multiple files\n- a\n- b\n- c"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/user-prompt-submit.mjs` (one JSON: the `AskUserQuestion` plan-mode step only, no end-of-task steps; `plan` mode + `#noplan` → exit JSON; a question in default mode prints the same ask (Claude picks the recommendation); `echo garbage | …` exits 1 with one stderr line; a `<task-notification>` prompt prints no ask)
- End-of-task smoke test: touch a scratch file, then `echo '{"session_id":"s1"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/stop.mjs` (block JSON whose one-line `reason` points at the steps file `git rev-parse --git-path cdk-task-end-<sha>.md`, which holds the numbered steps: the unit-test step naming `npm run test:unit` in this repo, then the docs step, then the changelog step (`cdk:update-changelog`, needs git and a safe state), then the commit step (needs git, a safe state, and no ship-release marker); a second run is silent, and `"stop_hook_active":true` records the tree and stays silent; test step only when a unit-test command is detected; Graphify step only when `graphify` is installed)
- Repo format-lint hook smoke test: `echo '{}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/stop.mjs` (no output when no covered file changed since its last run; the end-of-task gate needs no prior prompt-hook run: it blocks the first stop on an uncommitted tree with the steps and allows the next until the tree changes)
- Git guard smoke test: `echo '{"tool_name":"Bash","tool_input":{"command":"git push --force"},"cwd":"'$PWD'"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/pre-tool-use.mjs` (exit 2 for force push, `--no-verify`, `HUSKY=0`; `ask` JSON for `git reset --hard`; silent for `git status` and `git push origin v1.0.0`)
- Release hook smoke test: `echo '{"tool_name":"Bash","tool_input":{"command":"gh pr create -B main"}}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/pre-tool-use.mjs` (exit 2 with codes and fixes until the changelog and version are updated and pushed; exit 0 otherwise); validate directly: `node skills/bump-version/scripts/release-check.mjs check --target main`
- Validate hook smoke test: `echo '{"tool_input":{"file_path":"'"$PWD"'/skills/build-skill/SKILL.md"}}' | CLAUDE_PROJECT_DIR=$PWD node .claude/hooks/post-tool-use.mjs` (exit 0 and a `systemMessage` JSON naming `/reload-plugins` when valid; no output for paths outside the reload scopes)

## Precedence

- Order: explicit user request > path-scoped rule > this file > unconditional rules (`principles.md`, `git.md`) > skill defaults.
- Trade-off order: correctness > security > clarity > simplicity > maintainability > testability > measured performance.
- Conflict between two instructions → ask user; never resolve silently.
- graphify rules from ancestor `~/CLAUDE.md` do not apply here (no `graphify-out/`).

## Boundaries

- Force-push: see `.claude/rules/git.md` `## Push`. Ask first before `git reset --hard`, deleting branches, or `rm` of tracked files.
- Never commit or push directly to `main`; work on a Conventional Branch.
- Ask first before `git push` (an explicit commit or push request to a cdk git skill counts as consent to a normal, non-force push), creating a merge request or changing its title, description, branches, or merge options, approving, or merging. Local commits, review comments, thread replies and resolves, and reviewer requests need no ask; the permission prompt stays the second guard.
- Exception: the end-of-task hook's `cdk:commit-changes` run, once the user picks "Commit and push" in its ask, is consent for its commit and normal push (never force-push, MR, or merge).
- Exception: the release gate in `cdk:prepare-change-request` chains `cdk:commit-changes` (commit and normal push of the changelog and version only) after the user confirms the version bump (always asked, never skipped by `--yes`/`auto`); it never force-pushes and never overrides the check.
- Exception: `/cdk:ship-release` (GitHub or GitLab, by `origin` host) is consent for atomic signed commits, pushing, creating or updating the PR or MR, posting reviews and replies, and merging a clean PR or MR (not draft, conflict-free, required checks passing) with the squash and delete-source choices it asks once (the version bump inside it is still asked, and only because a PR or MR is being created); it continues past blockers and reports them but never bypasses controls, force-pushes, uses `--admin`, or deletes `main`.

## Changes

- Change only what the task needs; no unrelated edits or refactors; one logical change per commit.

## Definition of done

- [ ] `npm run lint` passes.
- [ ] `npm test` passes; each changed runtime `.mjs` has passing unit tests (and integration tests where `.claude/rules/tests.md` requires them).
- [ ] `npm audit --audit-level=moderate` passes (known upstream `braces` finding via `markdownlint-cli2` excepted until fixed).
- [ ] Each changed component passes the `Verify:` check in its `.claude/rules/` file.

## Maintenance

- Record a resolved issue in Claude auto memory (`feedback` memory + `MEMORY.md` pointer), never in the repo, only when it recurs or blocks the workflow; check auto memory before debug; reuse same fix for same issue.
