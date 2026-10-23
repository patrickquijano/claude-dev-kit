# cdk — Claude Dev Kit

Claude Code plugin (`name: cdk`): skills, subagents, and hooks for any framework or language.

## Architecture

- Skills: `skills/<name>/SKILL.md` — user-invoked workflows; orchestrator skills spawn subagents and own all user interaction, and `/cdk:ship-release` chains skills to ship a GitHub PR or GitLab MR end to end. `build-skill` and `build-subagent` run their `scripts/check-*.mjs`, score with the `rubric-scorer` agent, and delegate fixes to the `rubric-improver` agent for up to 3 rounds. Rules `.claude/rules/skills.md`.
- Subagents: `agents/` — read-only workers (analyzers, scorers, CR reviewers) spawned by skills (`topic-researcher` is also delegated to directly). Write exceptions and rules: `.claude/rules/agents.md`.
- Plugin hooks: `hooks/hooks.json` → one entry script per event in `hooks/scripts/`, logic in `hooks/scripts/lib/`. Event behavior and error policy: `.claude/rules/hooks.md`.
- Tests: `tests/unit/` and `tests/integration/`, each mirroring the source path. Rules `.claude/rules/tests.md`, `.claude/rules/es-modules.md`.
- Evals: `evals/<case>/` — `prompt.md` + `graders/`, LLM-graded behavioral cases for `claude plugin eval .`; the user runs them by hand, never Claude or a hook (skill-creator evals are separate: `cdk:build-skill` drafts itself and offers optional `skill-creator` evals).
- Project Claude config: the `.claude/settings.json` `PostToolUse` hook runs `claude plugin validate --strict .` (via `.claude/hooks/post-tool-use.mjs`) after Claude edits a plugin component.
- Git hooks (Husky): `.husky/` + `.commitlintrc.json` enforce `.claude/rules/git.md`. Canonical copies and sync rule: `.claude/rules/git-hooks.md`.
- Release enforcement: opt-in policy `.claude/release-policy.json`; `skills/bump-version/scripts/release-check.mjs` is shared by the `prepare-change-request` release gate and CI. Rules `.claude/rules/release.md`.

## Commands

- Validate plugin: `claude plugin validate --strict .`
- Test local: `claude --plugin-dir .`
- Plugin hook smoke test: `echo '{"tool_input":{"file_path":"<abs>"}}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/post-tool-use.mjs`
- SessionStart hook smoke test: `echo '{"source":"startup"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/session-start.mjs` (JSON with a `Today is …` line)
- Prompt hook smoke test: `echo '{"permission_mode":"default","prompt":"Implement X across multiple files\n- a\n- b\n- c"}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/user-prompt-submit.mjs` (one JSON with the `AskUserQuestion` plan-mode ask; `echo garbage | …` exits 1 with one stderr line)
- Repo format-lint hook smoke test: `echo '{}' | CLAUDE_PROJECT_DIR=$PWD node hooks/scripts/stop.mjs` (no output when no covered file changed since its last run)
- Release check: `node skills/bump-version/scripts/release-check.mjs check --target main` (exit 1 until the changelog and version are updated and pushed)
- Validate hook smoke test: `echo '{"tool_input":{"file_path":"'"$PWD"'/skills/build-skill/SKILL.md"}}' | CLAUDE_PROJECT_DIR=$PWD node .claude/hooks/post-tool-use.mjs` (exit 0 and no output when valid)

## Precedence

- Order: explicit user request > path-scoped rule > this file > unconditional rules (`principles.md`, `git.md`, `release.md`) > skill defaults.
- Trade-off order: correctness > security > clarity > simplicity > maintainability > testability > measured performance.
- Conflict between two instructions → ask user; never resolve silently.
- graphify rules from ancestor `~/CLAUDE.md` do not apply here (no `graphify-out/`).

## Boundaries

- Ask first before `git reset --hard`, deleting branches, or `rm` of tracked files.
- Never commit or push directly to `main`; work on a Conventional Branch.
- Never commit secrets or credentials; read them from env vars.
- Ask first before `git push` (an explicit commit or push request to a cdk git skill counts as consent to a normal, non-force push), creating a merge request or changing its title, description, branches, or merge options, approving, or merging. Local commits, review comments, thread replies and resolves, and reviewer requests need no ask; the permission prompt stays the second guard.
- Exception: the release gate in `cdk:prepare-change-request` chains `cdk:commit-changes` (commit and normal push of the changelog and version only).
- Exception: `/cdk:ship-release` (GitHub or GitLab, by `origin` host) is consent for atomic signed commits, pushing, creating or updating the PR or MR, posting reviews and replies, and merging a clean PR or MR (not draft, conflict-free, required checks passing) with the squash and delete-source choices it asks once; it continues past blockers and reports them, never using `--admin`.

## Changes

- Change only what the task needs; no unrelated edits or refactors; one logical change per commit.

## Definition of done

- [ ] `npm run lint` passes.
- [ ] `npm test` passes; new or changed behavior has a test.
- [ ] `npm run audit` passes.
- [ ] Each changed component passes the `Verify:` check in its `.claude/rules/` file.

## Maintenance

- Record a resolved issue in Claude auto memory (`feedback` memory + `MEMORY.md` pointer), never in the repo, only when it recurs or blocks the workflow; check auto memory before debug; reuse same fix for same issue.
