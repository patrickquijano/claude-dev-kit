# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- GitHub pull request skills: `/cdk:prepare-pull-request` reviews a branch with parallel reviewers and opens or updates the PR, `/cdk:review-pull-request` reviews a PR (optionally merging it), and `/cdk:address-pull-request-review` works through review feedback.
- `/cdk:setup-permissions` builds Claude Code permission rules from the commands a repository runs, including read-only subcommand rules and MCP tool rules.
- `/cdk:write-github-workflows` writes or updates GitHub Actions workflows with resolved, pinned versions.
- `/cdk:write-changelog` creates or updates `CHANGELOG.md` per Keep a Changelog.
- `/cdk:bump-version` sets the version files named by `.claude/release-policy.json` to the Semantic Versioning value the branch commits require.
- Release enforcement for repositories with `.claude/release-policy.json`: PR and MR creation is blocked until `CHANGELOG.md` has a new `Unreleased` entry and the version is bumped, through a release gate in the PR and MR skills, a project `PreToolUse` hook, and a CI check.
- Every skill that reports findings ends with a resolve-findings step that analyzes each open item and proposes or applies a fix; `/cdk:build-skill` requires it in new skills and `cdk:skill-auditor` checks it.
- `SessionStart` hook injects today's date and time, plus Graphify usage rules when Graphify is configured; `Stop` hooks now run in sequence and add Graphify updates and an automatic `cdk:commit-changes` for changes made in the session.
- `/cdk:commit-changes` handles small changes in one step without a subagent.
- `/cdk:ship-changes` asks for its settings once, then pushes, opens the PR or MR, reviews, and merges clean changes.
- `/cdk:setup-git` validates and repairs git identity and signing configuration.
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
