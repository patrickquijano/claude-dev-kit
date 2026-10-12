# cdk — Claude Dev Kit

Claude Code plugin (`name: cdk`): skills, subagents, and hooks for any framework or language.

## Architecture

- Manifest: `.claude-plugin/` — `plugin.json` + `marketplace.json`; components live at repo root.
- Skills: `skills/<name>/SKILL.md` — user-invoked workflows; orchestrator skills spawn subagents and own all user interaction. `skills/ship-release/` (`/cdk:ship-release`) chains skills to ship a GitHub PR or GitLab MR end to end (branch, atomic commits, release files, PR/MR, review rounds, merge, sync). Shared rule files across skills: list in `.claude/rules/skills.md`.
- Subagents: `agents/` — read-only workers (analyzers, scorers, CR reviewers) spawned by skills (except `topic-researcher`, delegated to directly); return results to the caller. Exceptions: `security-scanner` writes redacted reports under `.vulnerability-reports/` only; `cr-feedback-implementer` edits only the files its group plan names (no Bash); `cr-feedback-validator` runs the repo's documented checks in check mode. None of the `cr-feedback-*` agents get `gh` or git writes.
- Plugin hooks: `hooks/hooks.json` → `hooks/scripts/format-lint.mjs` (`PostToolUse`, format then lint each file Claude edits; statuses on one `|` line), `stop.mjs` (the only `Stop` hook; runs the steps below in order and stops at the first block, so commit runs last), `format-lint-repo.mjs` (`Stop` step 1, format then lint the whole repo per file-type group whose files changed since its last run; blocks on errors and warnings), `session-start.mjs` (`SessionStart`, injects today's date and time, plus Graphify usage rules when `graphify` is installed, configured, and `graphify-out/` has all three files; records the session-start tree baseline), `plan-mode.mjs` (`UserPromptSubmit`, classifies the prompt and asks Claude via context to call `EnterPlanMode` or `ExitPlanMode`; never blocks), `graphify-stop.mjs` (`Stop` step 2, `graphify update .` when the tree changed, or a one-time `graphify` skill init, when Graphify is configured; never blocks on failure) and `commit-stop.mjs` (`Stop` step 3, independent of Graphify, asks Claude to run `cdk:commit-changes` with push on a tree dirtied since session start, and skips while the `/cdk:ship-release` marker (`git rev-parse --git-path cdk-ship-release`) exists; skips merge, rebase, and detached-HEAD states), in any project. Shared: `hooks/scripts/tools.mjs` (tool table), `graphify.mjs` (Graphify detection), `git-state.mjs` (tree snapshot, unsafe-state check, temp state files).
- Evals: `evals/<case>/` — `prompt.md` + `graders/`, LLM-graded behavioral cases for `claude plugin eval .`; the user runs them by hand, never Claude or a hook.
- Project Claude config: `.claude/settings.json` `PostToolUse` hook → `.claude/hooks/plugin-validate.mjs` — after Claude edits a file under `skills/`, `commands/`, `agents/`, `evals/`, `hooks/`, `.claude-plugin/`, runs structural `claude plugin validate --strict .`; exits 2 on any error or warning so Claude fixes it. Hooks cannot run slash commands, so a valid edit under `skills/`, `commands/`, `agents/`, `hooks/` prints a `systemMessage` telling the user to run `/reload-plugins` then `/compact`, and an edit under `.claude/{agents,hooks,rules,skills}/`, `.claude/settings.json`, `.claude/CLAUDE.md` prints `/reload-skills` and adds `additionalContext` so Claude re-reads the file; each command appears once per run, other paths print nothing. Rules `.claude/rules/`.
- VS Code tasks: `.vscode/tasks.json` (only tracked file in `.vscode/`) — lint, format, per-tool checks, plugin validate, local branch cleanup.
- Git hooks (Husky): `.husky/` + `.commitlintrc.json` — `commit-msg` (commitlint via detected package manager, imperative check, signing config), `post-commit` (signature report); enforce `.claude/rules/git.md`. Canonical copies in `skills/setup-husky/assets/`; keep identical. `.gitattributes` keeps both LF.
- Release enforcement: opt-in policy `.claude/release-policy.json`; one script `hooks/scripts/release-check.mjs` (tests `hooks/scripts/release-check.test.mjs`) shared by the release gate in `prepare-change-request` (`release-gate.md`, chains `bump-version` (which chains `write-changelog` when a changelog exists), then `write-changelog` for any remaining changelog failure, then `commit-changes`), the project `PreToolUse` hook in `.claude/settings.json`, and the required CI check `.github/workflows/release-check.yml`. Rules `.claude/rules/release.md`.
- GitHub release: `skills/create-github-release/` (`SKILL.md`, `release-notes.md`); parsing, SemVer, tag-prefix, and notes logic in `hooks/scripts/changelog-release.mjs` (tests `hooks/scripts/changelog-release.test.mjs`); one confirmation covers the tag push and release, never force.
- Skill assets: `skills/<name>/assets/` copied into target projects (`setup-husky` hooks and `commit-rules.md`, `setup-test-hook` `run-tests.mjs`, `setup-graphify` `graphify-rules.md`).
- GitHub: PR template `.github/pull_request_template.md`.

## Commands

- Lint: `npm run lint`
- Test: `npm test` (release-check and changelog-release scripts)
- Format: `npm run format`
- Validate plugin: `claude plugin validate --strict .`
- Never run `claude plugin eval` (LLM-graded behavioral evals); structural validation only.
- Test local: `claude --plugin-dir .`, then `/reload-plugins` after edits
- Commit msg check: `npx commitlint --edit <file>`
- Plugin hook smoke test: `echo '{"tool_input":{"file_path":"<abs>"}}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/format-lint.mjs`
- SessionStart hook smoke test: `echo '{"source":"startup"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/session-start.mjs` (JSON with `Today is …` line; Graphify rules only when configured)
- Plan-mode hook smoke test: `echo '{"permission_mode":"default","prompt":"Implement X across multiple files\n- a\n- b\n- c"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/plan-mode.mjs` (enter JSON; `plan` mode + a question → exit JSON; no output otherwise)
- Stop dispatcher smoke test: `echo '{"session_id":"t"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/stop.mjs` (one JSON object; a format-lint or Graphify block suppresses the commit step)
- Commit Stop hook smoke test: `echo '{"session_id":"t"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/commit-stop.mjs` (dirty tree → block asking for `cdk:commit-changes`; clean → `⏺ No Git changes to commit`)
- Graphify Stop hook smoke test: `echo '{"session_id":"t"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/graphify-stop.mjs` (no output unless Graphify is configured)
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
- Exception: the plugin's `Stop` hook (`commit-stop.mjs`, last step of `stop.mjs`) instructs Claude to run `cdk:commit-changes` with a normal push in any git repo whose tree changed since session start (never pre-session work, never mid-merge or rebase); that covers the commit and push only (never force-push, MR, or merge).
- Exception: the release gate in `cdk:prepare-change-request` chains `cdk:commit-changes` (commit and normal push of the changelog and version only) after one ask, or with `--yes`/`auto`; it never force-pushes and never overrides the check.
- Exception: `/cdk:ship-release` (GitHub or GitLab, by `origin` host) is consent for atomic signed commits, pushing, creating or updating the PR or MR, posting reviews and replies, and merging a clean PR or MR (not draft, conflict-free, required checks passing) with the squash and delete-source choices it asks once; it continues past blockers and reports them but never bypasses controls, force-pushes, uses `--admin`, or deletes `main`.
- Secrets and hook bypass: see `.claude/rules/git.md`.

## Changes

- Change only what the task needs; no unrelated edits or refactors. Atomic commits: `.claude/rules/git.md`.

## Definition of done

- [ ] `npm run format`, then `npm run lint` pass.
- [ ] `npm test` passes.
- [ ] `node hooks/scripts/release-check.mjs check --target main` passes before any PR or MR.
- [ ] `claude plugin validate --strict .` passes.
- [ ] The `PostToolUse` validate hook reports no error or warning; fix everything it reports.
- [ ] Each changed component passes the `Verify:` check in its `.claude/rules/` file.

## Maintenance

- Update this file, `.claude/rules/`, and `README.md` skills/agents tables in the same change that adds or alters a component, path, or convention.
- Record a resolved issue in Claude auto memory (`feedback` memory + `MEMORY.md` pointer), never in the repo, only when it recurs or blocks the workflow; check auto memory before debug; reuse same fix for same issue.
