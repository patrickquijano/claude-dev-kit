# cdk — Claude Dev Kit

Claude Code plugin (`name: cdk`): skills, subagents, and hooks for any framework or language.

## Architecture

- Manifest: `.claude-plugin/` — `plugin.json` + `marketplace.json`; components live at repo root.
- Skills: `skills/<name>/SKILL.md` — user-invoked workflows; orchestrator skills spawn subagents and own all user interaction. `skills/ship-release/` (`/cdk:ship-release`) chains skills to ship a GitHub PR or GitLab MR end to end (branch, atomic commits, release files, PR/MR, review rounds, merge, sync). Shared rule files across skills: list in `.claude/rules/skills.md`.
- Subagents: `agents/` — read-only workers (analyzers, scorers, CR reviewers) spawned by skills (`topic-researcher` is also delegated to directly); return results to the caller. Exceptions: `security-scanner` writes redacted reports under `.vulnerability-reports/` only; `cr-feedback-implementer` edits only the files its group plan names (no Bash); `cr-feedback-validator` runs the repo's documented checks in check mode. None of the `cr-feedback-*` agents get `gh` or git writes.
- Plugin hooks: `hooks/hooks.json` → `hooks/scripts/format-lint.mjs` (`PostToolUse`, format then lint each file Claude edits; statuses on one `|` line), `format-lint-repo.mjs` (`Stop`, format then lint the whole repo per file-type group whose files changed since its last run; blocks on errors and warnings), `session-start.mjs` (`SessionStart`, injects today's date and time, plus Graphify usage rules when `graphify` is installed, configured, and `graphify-out/` has all three files), `user-prompt-submit.mjs` (`UserPromptSubmit`, the one dispatcher: runs `plan-mode.mjs` then `task-end.mjs` and merges their context; never blocks). `plan-mode.mjs` asks the user before `EnterPlanMode` and calls `ExitPlanMode` only for `#noplan`; `task-end.mjs` tells Claude to run Graphify (when configured), then `cdk:commit-changes` with `paths:` set to the files this task changed. Details: `.claude/rules/hooks.md`. Npx formatters run only when installed or configured. Shared: `hooks/scripts/tools.mjs` (tool table), `graphify.mjs` (Graphify detection), `git-state.mjs` (unsafe-state check, temp state files).
- Tests: `tests/unit/` (pure, stubbed `deps`) and `tests/integration/` (real git, fs, spawned CLIs), each mirroring the source path (`hooks/scripts/a.mjs` → `tests/unit/hooks/scripts/a.test.mjs`); every runtime `.mjs` has unit tests (≥2 positive, ≥2 negative per export, AAA). Rules `.claude/rules/tests.md`, `.claude/rules/es-modules.md`.
- Evals: `evals/<case>/` — `prompt.md` + `graders/`, LLM-graded behavioral cases for `claude plugin eval .`; the user runs them by hand, never Claude or a hook.
- Project Claude config: `.claude/settings.json` `PostToolUse` hook → `.claude/hooks/plugin-validate.mjs` — after Claude edits a file under `skills/`, `commands/`, `agents/`, `evals/`, `hooks/`, `.claude-plugin/`, runs structural `claude plugin validate --strict .`; exits 2 on any error or warning so Claude fixes it. Hooks cannot run slash commands, so a valid edit under `skills/`, `commands/`, `agents/`, `hooks/` prints a `systemMessage` telling the user to run `/reload-plugins` then `/compact`, and an edit under `.claude/{agents,hooks,rules,skills}/`, `.claude/settings.json`, `.claude/CLAUDE.md` prints `/reload-skills` and adds `additionalContext` so Claude re-reads the file; each command appears once per run, other paths print nothing. Rules `.claude/rules/`.
- VS Code tasks: `.vscode/tasks.json` (only tracked file in `.vscode/`) — lint, format, per-tool checks, plugin validate, local branch cleanup.
- Git hooks (Husky): `.husky/` + `.commitlintrc.json` — `commit-msg` (commitlint via detected package manager, imperative check, signing config), `post-commit` (signature report); enforce `.claude/rules/git.md`. Canonical copies in `skills/setup-husky/assets/`; keep identical. `.gitattributes` keeps both LF.
- Release enforcement: opt-in policy `.claude/release-policy.json`; one script `hooks/scripts/release-check.mjs` (tests `tests/{unit,integration}/hooks/scripts/release-check.test.mjs`) shared by the release gate in `prepare-change-request` (`references/release-gate.md`, chains `bump-version` (which chains `write-changelog` when a changelog exists), then `write-changelog` for any remaining changelog failure, then `commit-changes`), the project `PreToolUse` hook in `.claude/settings.json`, and the required CI check `.github/workflows/release-check.yml`. Rules `.claude/rules/release.md`.
- GitHub release: `skills/create-github-release/` (`SKILL.md`, `references/release-notes.md`); parsing, SemVer, tag-prefix, and notes logic in `hooks/scripts/changelog-release.mjs` (tests `tests/{unit,integration}/hooks/scripts/changelog-release.test.mjs`); one confirmation covers the tag push and release, never force.
- Skill layout (Agent Skills spec): `skills/<name>/SKILL.md` plus `references/` (docs Claude reads; `commands.md` holds every runnable command, referenced by name from a thin SKILL.md; conditional branches in `references/<topic>.md`), `assets/` (content copied or filled into output), `scripts/` (executables). Rules `.claude/rules/skills.md`.
- Skill assets: `skills/<name>/assets/` copied into target projects (`setup-husky` hooks and `commit-rules.md`, `setup-test-hook` `run-tests.mjs`, `setup-graphify` `graphify-rules.md`).
- GitHub: PR template `.github/pull_request_template.md`.

## Commands

- Lint: `npm run lint`
- Test: `npm test` (unit then integration); `npm run test:unit`, `npm run test:integration`
- Audit: `npm audit --audit-level=moderate`
- Format: `npm run format`
- Validate plugin: `claude plugin validate --strict .`
- Never run `claude plugin eval` (LLM-graded behavioral evals); structural validation only.
- Test local: `claude --plugin-dir .`, then `/reload-plugins` after edits
- Commit msg check: `npx commitlint --edit <file>`
- Plugin hook smoke test: `echo '{"tool_input":{"file_path":"<abs>"}}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/format-lint.mjs`
- SessionStart hook smoke test: `echo '{"source":"startup"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/session-start.mjs` (JSON with `Today is …` line; Graphify rules only when configured)
- Prompt hook smoke test: `echo '{"permission_mode":"default","prompt":"Implement X across multiple files\n- a\n- b\n- c"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/user-prompt-submit.mjs` (one JSON: the `AskUserQuestion` plan-mode step, then the end-of-task steps; `plan` mode + `#noplan` → exit JSON; a question in default mode prints nothing)
- End-of-task smoke test: `echo '{"permission_mode":"default","prompt":"Fix X"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/user-prompt-submit.mjs` (JSON with the commit step; a question, a `/` or `!` prompt, or the ship-release marker prints nothing; Graphify step only when configured)
- Repo format-lint hook smoke test: `echo '{}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/format-lint-repo.mjs` (no output when no covered file changed since its last run)
- Release hook smoke test: `echo '{"tool_name":"Bash","tool_input":{"command":"gh pr create -B main"}}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/release-check.mjs hook` (exit 2 with codes and fixes until the changelog and version are updated and pushed; exit 0 otherwise); validate directly: `node hooks/scripts/release-check.mjs check --target main`
- Validate hook smoke test: `echo '{"tool_input":{"file_path":"'"$PWD"'/skills/build-skill/SKILL.md"}}' | CLAUDE_PROJECT_DIR=$PWD node .claude/hooks/plugin-validate.mjs` (exit 0 and a `systemMessage` JSON naming `/reload-plugins` when valid; no output for paths outside the reload scopes)

## Precedence

- Order: explicit user request > path-scoped rule > this file > unconditional rules (`principles.md`, `git.md`) > skill defaults.
- Conflict between two instructions → ask user; never resolve silently.
- graphify rules from ancestor `~/CLAUDE.md` do not apply here (no `graphify-out/`).

## Boundaries

- Force-push: see `.claude/rules/git.md` `## Push`. Ask first before `git reset --hard`, deleting branches, or `rm` of tracked files.
- Never commit or push directly to `main`; work on a Conventional Branch.
- Ask first before `git push` (an explicit commit or push request to a cdk git skill counts as consent to a normal, non-force push), creating a merge request or changing its title, description, branches, or merge options, approving, or merging. Local commits, review comments, thread replies and resolves, and reviewer requests need no ask; the permission prompt stays the second guard.
- Exception: the plugin's end-of-task hook (`task-end.mjs` via `user-prompt-submit.mjs`) instructs Claude to run `cdk:commit-changes` with a normal push for this task's changes once the task is done (never pre-existing changes, never mid-merge or rebase); that covers the commit and push only (never force-push, MR, or merge).
- Exception: the release gate in `cdk:prepare-change-request` chains `cdk:commit-changes` (commit and normal push of the changelog and version only) after the user confirms the version bump (always asked, never skipped by `--yes`/`auto`); it never force-pushes and never overrides the check.
- Exception: `/cdk:ship-release` (GitHub or GitLab, by `origin` host) is consent for atomic signed commits, pushing, creating or updating the PR or MR, posting reviews and replies, and merging a clean PR or MR (not draft, conflict-free, required checks passing) with the squash and delete-source choices it asks once (the version bump inside it is still asked, and only because a PR or MR is being created); it continues past blockers and reports them but never bypasses controls, force-pushes, uses `--admin`, or deletes `main`.
- Secrets and hook bypass: see `.claude/rules/git.md`.

## Changes

- Change only what the task needs; no unrelated edits or refactors. Atomic commits: `.claude/rules/git.md`.

## Definition of done

- [ ] `npm run format`, then `npm run lint` pass.
- [ ] `npm test` passes; each changed runtime `.mjs` has passing unit tests (and integration tests where `.claude/rules/tests.md` requires them).
- [ ] `npm audit --audit-level=moderate` passes (known upstream `braces` finding via `markdownlint-cli2` excepted until fixed).
- [ ] `node hooks/scripts/release-check.mjs check --target main` passes before any PR or MR.
- [ ] `claude plugin validate --strict .` passes.
- [ ] The `PostToolUse` validate hook reports no error or warning; fix everything it reports.
- [ ] Each changed component passes the `Verify:` check in its `.claude/rules/` file.

## Maintenance

- Update this file, `.claude/rules/`, and `README.md` skills/agents tables in the same change that adds or alters a component, path, or convention.
- Record a resolved issue in Claude auto memory (`feedback` memory + `MEMORY.md` pointer), never in the repo, only when it recurs or blocks the workflow; check auto memory before debug; reuse same fix for same issue.
