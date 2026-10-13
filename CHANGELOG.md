# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- The end-of-task hook now tells Claude to run the project's unit tests first, using the detected command (`test:unit` or `test` script, pytest, go, cargo, or phpunit), and to fix and re-run until they pass.
- The end-of-task hook now tells Claude to add Unreleased entries with `cdk:write-changelog` when the task changed user-facing behavior and `CHANGELOG.md` exists, before the docs and commit steps; it never cuts a release or bumps the version.
- `/cdk:build-skill` is rebuilt as a companion to `skill-creator`: it asks the scope (personal, project, or plugin) and kind (reference, task, or background-only) with a reasoned recommendation, hands the draft to `skill-creator` under bundled frontmatter and body rules (and stops with install steps when `skill-creator` is missing), then scores it against a 100-point rubric (pass at 95) and fixes deductions for up to 3 rounds. Orchestrator and subagent building is dropped; use `/cdk:build-agent` for subagents.
- `cdk:skill-scorer` agent scores a skill directory against the `build-skill` rubric.

### Changed

- Files shared across skills (known issues, fallbacks, resolve-findings, orchestration) moved from `build-skill` to a new never-invoked `shared` skill, and the subagent template moved to `build-agent`; `cdk:skill-auditor` is now spawned by `build-agent` only.
- The end-of-task hook now injects its steps on every prompt, including questions and `/` and `!` prompts, and leaves a step out only when it cannot run: the changelog step needs git and a safe state (not `CHANGELOG.md`), the Graphify step needs the `graphify` binary (with a `/cdk:setup-graphify` hint when no graph exists), the docs step always runs, and a `/cdk:ship-release` run removes only the commit step.

### Fixed

- `cdk:review-change-request` squash merges now use the PR or MR title as the commit subject with an empty body, so the squash commit passes commitlint instead of carrying a list of every commit subject.

## [3.0.0] - 2026-10-13

### Added

- `/cdk:ship-release` is now a skill that ships through a GitHub pull request or a GitLab merge request, chosen by the `origin` host: it switches off a protected branch, makes atomic signed commits, updates the version, changelog, and README, opens the PR or MR, reviews it, addresses open items, merges a clean one, and syncs the target branch.
- `/cdk:prepare-change-request`, `/cdk:review-change-request`, and `/cdk:address-change-request-review` work on GitHub pull requests and GitLab merge requests alike, chosen by the `origin` host. They take `--yes` to skip only their confirmation asks, `--target`, `--draft`, `--dry-run`, `--squash`, `--delete-branch`, and `--self-review` where they apply, plus an optional PR or MR number.
- Inline review comments on both hosts use Conventional Comments labels such as `issue (blocking)`, `suggestion`, `question`, and `nit`, and the review skips findings already discussed.
- `cdk:review-change-request` replies to and resolves your own threads that the new code addresses, on GitHub as well as GitLab.
- `cdk:address-change-request-review` keeps a state file, protects uncommitted changes, asks before pushing and before posting replies, and re-requests review on GitLab as well as GitHub.
- The end-of-task hook now tells Claude to update the README and related docs when the task changed what they describe, before the commit step.
- `/cdk:debug-issue` finds a bug's root cause from an error, stack trace, or failing test, proves it with a failing regression test, and fixes it after you confirm.
- `/cdk:review-local-changes` reviews your unpushed commits and uncommitted changes before they are committed, with parallel read-only reviewers, then fixes the safe findings and asks about the rest.
- `/cdk:setup-testing` sets up unit, integration, and end-to-end test tooling per package: it detects the stack, recommends a tester for each kind, installs and configures the missing ones in the stack's native folder layout, adds run scripts, and notes the commands in the project context. `/cdk:setup-project` and the `write-*-tests` skills chain it.
- The plugin `PreToolUse` hook now guards git: it blocks force pushes, `--no-verify`, and `HUSKY=0`, and asks before `git reset --hard` and similar destructive commands, before the release check runs.

### Changed

- The end-of-task commit and Graphify update now run from the `UserPromptSubmit` hook instead of `Stop` hooks, and commit only the files that task changed. The same hook asks before entering plan mode on every prompt, with Claude weighing from its context whether to recommend entering or continuing, and leaves plan mode only for `#noplan`.
- Hooks fail fast: expected conditions (no git repo, missing tool or state file, unwritable temp dir) skip silently, and any other error ends the hook with one `cdk <hook>: <message>` line on stderr instead of being swallowed. The release and validate gates exit 2 on such an error; every other hook and the Husky and `run-tests` copies exit 1.
- Hook scripts are named after their event (`post-tool-use.mjs`, `stop.mjs`, `pre-tool-use.mjs`, `session-start.mjs`, `user-prompt-submit.mjs`) and their logic and shared helpers moved to `hooks/scripts/lib/`; update any command that vendors or calls the old script paths.
- Hook runs on Windows reject arguments with `cmd.exe` metacharacters, and `npx` formatters run only when installed or configured.
- **Breaking:** `cdk:prepare-change-request` no longer switches the source branch for you; it stops and suggests `/cdk:switch-branch`. Review and address skills ask before posting on GitLab, as they already did on GitHub.
- **Breaking:** `/cdk:ship-release` commits atomically before opening the PR or MR and reviews it there, up to 3 rounds, instead of reviewing locally and making one commit. It asks once whether to squash and delete the source branch.
- Skills follow the Agent Skills layout (`references/`, `assets/`, `scripts/`) and keep their shell commands in a per-skill `references/commands.md`; workflows are shorter and move conditional steps into topic files, so runs read less and load detail only when needed.
- Known issues no longer need a commit: skill fixes are saved to `${CLAUDE_PLUGIN_DATA}/known-issues/<skill>.md`, shared across projects, and project fixes go to Claude auto memory. `cdk:write-claude-md` no longer generates a `## Known issues` section and moves existing entries to auto memory.

### Removed

- **Breaking:** `prepare-pull-request`, `prepare-merge-request`, `review-pull-request`, `review-merge-request`, `address-pull-request-review`, and `address-merge-request-review` are replaced by the three `*-change-request*` skills above, with no aliases. `cdk:mr-reviewer` and `cdk:review-thread-triager` are removed, and the `pr-*` reviewer and `pr-feedback-*` agents are renamed to `cr-*` and `cr-feedback-*`.
- **Breaking:** the PR reviewer agents no longer review an uncommitted working tree, and the plugin no longer ships a `commands/` directory.
- **Breaking:** `/cdk:setup-test-hook` and the `cdk:test-suite-analyzer` agent are removed in favor of `/cdk:setup-testing`; the project `Stop` test hook it installed is no longer set up.

## [2.1.0] - 2026-10-11

### Added

- `/cdk:bump-version` accepts a `subject <file>` input, so the required version covers a commit that is still to come.
- The PR reviewer agents can review the uncommitted working tree, which `/cdk:ship-release` uses to review before it commits.

### Changed

- `/cdk:ship-release` reviews and fixes your changes locally first (up to 5 rounds, no commits), then makes one signed commit, instead of committing during the review loop. It continues past blockers and reports each one.
- The commit Stop hook waits while a `/cdk:ship-release` run is in progress, so it does not commit the tree mid-review.

## [2.0.0] - 2026-10-11

### Added

- `/cdk:ship-release` ships a GitHub release end to end: it commits, bumps the version and release notes, validates, opens a pull request to `main`, loops self-review and fixes (up to 5 rounds), squash-merges a clean PR, syncs `main`, and offers a cleanup of merged branches that deletes only after your explicit confirmation. It never force-pushes or deletes `main`.
- Plugin slash commands live in `commands/`, validated and reloaded like skills.

### Changed

- **Breaking:** `/cdk:scan-vulnerabilities` ships its fixes by switching off a protected branch, committing, and opening the PR or MR directly, instead of through `/cdk:ship-changes`.
- `/cdk:write-changelog release` can re-run on a version that exists only on the current branch and updates that unmerged section in place, instead of stopping.

### Removed

- **Breaking:** `/cdk:ship-changes`, `/cdk:ship-spec-kit-bug`, and `/cdk:ship-spec-kit-idea`; use `/cdk:ship-release` for GitHub releases.
- **Breaking:** the `auto` token of `/cdk:review-merge-request` and the `self-review` token of `/cdk:address-merge-request-review`.

## [1.1.0] - 2026-10-11

### Added

- `/cdk:create-github-release` creates the annotated tag and GitHub release for the latest version in `CHANGELOG.md` from the verified tip of `main`, using the changelog section as release notes. It asks once before writing, never force-pushes, and leaves an existing release untouched.

## [1.0.0] - 2026-10-11

### Added

- GitHub pull request skills: `/cdk:prepare-pull-request` reviews a branch with parallel reviewers and opens or updates the PR, `/cdk:review-pull-request` reviews a PR (optionally merging it), and `/cdk:address-pull-request-review` works through review feedback.
- `/cdk:setup-permissions` builds Claude Code permission rules from the commands a repository runs, including read-only subcommand rules and MCP tool rules.
- `/cdk:write-github-workflows` writes or updates GitHub Actions workflows with resolved, pinned versions.
- `/cdk:write-changelog` creates or updates `CHANGELOG.md` per Keep a Changelog.
- `/cdk:bump-version` sets the version files named by `.claude/release-policy.json` to the Semantic Versioning value the branch commits require, then updates the changelog when the repository has one.
- The release check accepts a deliberate higher version that has a matching new changelog release section, and `/cdk:bump-version` keeps it.
- Release enforcement for repositories with `.claude/release-policy.json`: PR and MR creation is blocked until `CHANGELOG.md` has a new `Unreleased` entry and the version is bumped, through a release gate in the PR and MR skills, a project `PreToolUse` hook, and a CI check.
- Every skill that reports findings ends with a resolve-findings step that analyzes each open item and proposes or applies a fix; `/cdk:build-skill` requires it in new skills and `cdk:skill-auditor` checks it.
- `SessionStart` hook injects today's date and time, plus Graphify usage rules when Graphify is configured; `Stop` hooks now run in sequence and add Graphify updates and an automatic `cdk:commit-changes` for changes made in the session.
- `/cdk:commit-changes` handles small changes in one step without a subagent.
- `/cdk:ship-changes` asks for its settings once, then pushes, opens the PR or MR, reviews, and merges clean changes.
- `/cdk:setup-git` validates and repairs git identity and signing configuration.
- A `UserPromptSubmit` hook classifies each prompt and asks Claude to enter or exit plan mode; it never blocks a prompt.
- `/cdk:setup-husky` enforces a 72-character commit header and writes a commit rules file.
- `/cdk:switch-branch` derives the branch name from the branch's unique commits.
- `/cdk:write-dockerfile` follows a distro order, builds tools in separate stages, and cleans up layers.
- VS Code task to delete other local branches.
- `npm test` runs the tests for the release check script.

### Changed

- **Breaking:** `/cdk:submit-merge-request` is now `/cdk:prepare-merge-request` and gains an `auto` mode; `/cdk:ship-merge-request` is replaced by `/cdk:ship-changes`.
- `/cdk:scan-vulnerabilities`, `/cdk:write-dockerfile`, and `/cdk:setup-devcontainer` resolve the latest stable scanner images, base image tags, and feature versions at run time.
- `/cdk:setup-format-lint` resolves the latest stable tool versions.
- `/cdk:prepare-pull-request` and `/cdk:prepare-merge-request` run the release gate before creating or updating a PR or MR.
- Skills chain other skills through the Skill tool in the main thread.

### Removed

- The `glab` read-guard hook.
- GitLab CI configuration and the merge request template; the repository now uses a GitHub pull request template.

### Fixed

- Skills route every stop path through the resolve-findings step and print consistent `Resolution:` lines, including `not run` for nothing-to-do exits.
- `/cdk:prepare-merge-request` pre-approves the exact `glab` template read.
- `/cdk:setup-devcontainer` uses stable tags.
- `/cdk:commit-changes` reports commitlint status.
