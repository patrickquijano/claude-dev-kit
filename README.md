# cdk — Claude Dev Kit

Claude Code plugin providing a development kit — skills, custom agents, and hooks — for any framework or language.

Adds guided Git and GitLab workflows (signed atomic commits, rebases, merge requests, reviews) plus skill, README, and CLAUDE.md authoring with scored rubrics, so Claude follows the same conventions in every repository.

> **Status:** experimental (v0.1.0). Skills, names, and behavior may change without notice.

## Compatibility

- [Claude Code](https://code.claude.com/docs) CLI (`claude`).
- Git; commit, rebase, and review-address skills sign commits when signing is configured. `/cdk:setup-git` SSH signing needs Git 2.34+; OpenPGP needs GnuPG.
- [`glab`](https://gitlab.com/gitlab-org/cli) CLI, authenticated, for the merge request skills.
- [`uv`](https://docs.astral.sh/uv/) for `/cdk:setup-spec-kit` when `specify` is not installed.
- [`uv`](https://docs.astral.sh/uv/) or `pipx` (Python 3.10+) for `/cdk:setup-graphify` when `graphify` is not installed.
- Node.js with npm, pnpm, yarn, or bun for `/cdk:setup-husky` and the npm tools of `/cdk:setup-format-lint`.
- Node.js for `/cdk:setup-test-hook` (the hook script runs on Node); the project's own test runners.
- The project's package manager for `/cdk:upgrade-dependencies`.
- The project's own test runners for the `/cdk:write-*-tests` skills; Docker for containerized integration dependencies.
- Docker for `/cdk:write-dockerfile` build checks; `hadolint` optional.
- Docker for `/cdk:setup-devcontainer` Compose checks; [`@devcontainers/cli`](https://github.com/devcontainers/cli) optional for `devcontainer read-configuration`.
- Docker for `/cdk:scan-vulnerabilities` (every scanner runs as a pinned container) and Spec Kit (`/cdk:setup-spec-kit`) for its remediation.
- Development only: Node.js with npm, `yamllint` and `yamlfmt` on `PATH`; `hadolint` optional (hook lints Dockerfiles when present).

## Install

```sh
claude plugin marketplace add https://github.com/patrickquijano/claude-dev-kit.git
claude plugin install cdk@claude-dev-kit
```

## Components

### Skills

| Skill                               | Purpose                                                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/cdk:address-merge-request-review` | Fix MR review threads with new commits, reply, resolve agreed threads, re-request review.                                         |
| `/cdk:address-pull-request-review`  | Address GitHub PR review feedback: classify, fix, validate, verify, then commit, push, reply, resolve, re-request after approval. |
| `/cdk:assess-spec-kit-idea`         | Assess an idea with Spec Kit intake to decide; go hands off to run-spec-kit unless `handoff=no`.                                  |
| `/cdk:build-agent`                  | Interview, then create or update a subagent in personal, project, or plugin scope.                                                |
| `/cdk:build-skill`                  | Interview, then create or update a skill or orchestrator + subagents.                                                             |
| `/cdk:commit-changes`               | Group changes into atomic, signed Conventional Commits, leave protected branches, push.                                           |
| `/cdk:fix-spec-kit-bug`             | Extract bug evidence, run Spec Kit assess, fix, test; retry fix until verified (max 3).                                           |
| `/cdk:prepare-pull-request`         | Pick a target branch, review with five read-only agents, then create or update a GitHub PR with a filled template.                |
| `/cdk:rebase-onto`                  | Fetch, pick a target branch, rebase with signed commits, resolve conflicts with you.                                              |
| `/cdk:review-merge-request`         | Review a GitLab MR; post labeled comments, resolve addressed own threads, approve and merge.                                      |
| `/cdk:review-pull-request`          | Review a GitHub PR with four read-only agents, run safe checks, post one review only after you approve, and optionally merge.     |
| `/cdk:run-spec-kit`                 | Split a feature brief, run Spec Kit from constitution to converge, address open items after.                                      |
| `/cdk:scan-vulnerabilities`         | Run pinned Docker security scanners, fix via run-spec-kit, validate, roll back, rescan (default 5 iterations).                    |
| `/cdk:setup-devcontainer`           | Detect stack and services, ask services and Claude Code, write a pinned image, Dockerfile, or Compose devcontainer.               |
| `/cdk:setup-editorconfig`           | Detect file types; create .editorconfig with per-type indentation and line-ending defaults.                                       |
| `/cdk:setup-format-lint`            | Detect file types; pick, install, configure formatters and linters with defaults and ignores.                                     |
| `/cdk:setup-git`                    | Init repo; ask identity and signing key, default SSH signing, test a signature; .gitignore.                                       |
| `/cdk:setup-graphify`               | Install graphify, add Claude and git hooks, build the graph, name communities, share graph and report, add ignores and rules.     |
| `/cdk:setup-husky`                  | Install Husky; add commit message and signing checks on recommended events; LF endings, ignores.                                  |
| `/cdk:setup-project`                | Detect missing setup, multi-select, then chain setup-git, -editorconfig, -format-lint, -husky, -test-hook.                        |
| `/cdk:setup-spec-kit`               | Install Spec Kit, init with Claude, add agent-context/assess/bug extensions, set ignores.                                         |
| `/cdk:setup-test-hook`              | Add a unit-only, fail-fast Stop test hook with per-suite cache; note commands, add VS Code tasks.                                 |
| `/cdk:ship-changes`                 | Branch, commit, push, open the GitLab MR or GitHub PR, then loop review and address rounds until clean (max 5).                   |
| `/cdk:ship-spec-kit-bug`            | Fix a bug with fix-spec-kit-bug, then ship and review the MR or PR; ask before shipping unverified.                               |
| `/cdk:ship-spec-kit-idea`           | Assess an idea with Spec Kit; on go, build it with run-spec-kit, then ship and review the MR or PR.                               |
| `/cdk:submit-merge-request`         | Create or update a GitLab MR with template, reviewers, delete-source and squash options.                                          |
| `/cdk:switch-branch`                | Derive a Conventional Branch name from changes, switch to it, push.                                                               |
| `/cdk:upgrade-dependencies`         | Find outdated packages, check breaking changes, apply fixes, and validate each upgrade.                                           |
| `/cdk:write-claude-md`              | Merge guidelines and engineering principles into CLAUDE.md and `.claude/rules`; score /100 until ≥95.                             |
| `/cdk:write-dockerfile`             | Write a multi-stage, digest-pinned Dockerfile and `.dockerignore` from input and repo facts.                                      |
| `/cdk:write-e2e-tests`              | Write AAA, faker-based end-to-end tests for critical journeys; run-fix until new tests pass (max 3).                              |
| `/cdk:write-integration-tests`      | Write AAA, faker-based integration tests per boundary with containers, stubs, or fakes (max 3 fix rounds).                        |
| `/cdk:write-prompt`                 | Draft a brief Claude Code prompt from a rough task, checked against prompt anti-patterns.                                         |
| `/cdk:write-readme`                 | Create or update README.md from templates, score it /100, iterate until ≥95.                                                      |
| `/cdk:write-unit-tests`             | Write AAA, faker-based unit tests (≥2 positive, ≥2 negative each) until coverage target (default 90%, max 5).                     |

### Agents

Spawned by skills; not meant for direct use, except `cdk:topic-researcher`.

| Agent                             | Purpose                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cdk:change-analyzer`             | Read changes; draft atomic commit groups, a branch name, or an MR title and description for `commit-changes`, `switch-branch`, `submit-merge-request`. |
| `cdk:claude-md-analyzer`          | Extract and flag memory-file instructions; collect commands, stack, and patterns for `write-claude-md`.                                                |
| `cdk:claude-md-scorer`            | Score CLAUDE.md and rules against the 100-point rubric for `write-claude-md`.                                                                          |
| `cdk:conflict-analyzer`           | Analyze one conflicted file and propose a resolution for `rebase-onto`.                                                                                |
| `cdk:dependency-analyzer`         | Find outdated packages, breaking changes, and affected code for `upgrade-dependencies`.                                                                |
| `cdk:devcontainer-analyzer`       | Detect stacks, versions, services, ports, and existing Docker files for `setup-devcontainer`.                                                          |
| `cdk:dockerfile-reviewer`         | Check a Dockerfile against practices, `docker build --check`, hadolint for `write-dockerfile`.                                                         |
| `cdk:format-lint-analyzer`        | Detect file types, filled roles, candidates, and package manager, or run checks for `setup-format-lint`.                                               |
| `cdk:mr-reviewer`                 | Review an MR diff against guidelines for `review-merge-request`.                                                                                       |
| `cdk:pr-feedback-collector`       | Rank open PRs by unresolved feedback or normalize raw review data for `address-pull-request-review`.                                                   |
| `cdk:pr-feedback-implementer`     | Apply one planned group of review fixes to the working tree for `address-pull-request-review`.                                                         |
| `cdk:pr-feedback-planner`         | Classify feedback items, group them, detect conflicts, and plan changes for `address-pull-request-review`.                                             |
| `cdk:pr-feedback-replier`         | Draft per-item replies with commit and validation evidence for `address-pull-request-review`.                                                          |
| `cdk:pr-feedback-validator`       | Run the repo's documented checks in check mode for `address-pull-request-review`.                                                                      |
| `cdk:pr-feedback-verifier`        | Verify each feedback item against the final diff and validation for `address-pull-request-review`.                                                     |
| `cdk:pr-correctness-reviewer`     | Review the branch diff for bugs, regressions, and unintended changes for `prepare-pull-request`, `review-pull-request`.                                |
| `cdk:pr-docs-reviewer`            | Review the branch diff for documentation, configuration, migration, and changelog needs for `prepare-pull-request`.                                    |
| `cdk:pr-maintainability-reviewer` | Review the branch diff for duplication, dead code, naming, layering, and convention drift for `prepare-pull-request`, `review-pull-request`.           |
| `cdk:pr-security-reviewer`        | Review the branch diff for secrets, authorization, validation, injection, and dependency risks for `prepare-pull-request`, `review-pull-request`.      |
| `cdk:pr-test-reviewer`            | Review test coverage and run the documented checks for `prepare-pull-request`, `review-pull-request`.                                                  |
| `cdk:readme-analyzer`             | Collect repo facts and guess README archetype for `write-readme`.                                                                                      |
| `cdk:readme-scorer`               | Score README against the 100-point rubric for `write-readme`.                                                                                          |
| `cdk:review-thread-triager`       | Label, classify, and plan each MR review thread for `address-merge-request-review`.                                                                    |
| `cdk:security-scanner`            | Run applicable Docker scanners, redact, dedupe, and prioritize findings for `scan-vulnerabilities`.                                                    |
| `cdk:skill-auditor`               | Check skills and agents against repo rules and skill-agent contracts for `build-skill`, `build-agent`.                                                 |
| `cdk:speckit-open-items`          | Find open Spec Kit items and propose fixes per round for `run-spec-kit`.                                                                               |
| `cdk:test-gap-analyzer`           | Detect stack, test tooling, conventions, and untested targets for the `write-*-tests` skills.                                                          |
| `cdk:test-suite-analyzer`         | Detect one package's test suites and runners for `setup-test-hook`.                                                                                    |
| `cdk:topic-researcher`            | Research a topic across 3–6 sources and return cited, reconciled findings; delegate to it directly.                                                    |

### Hooks

| Event                      | Script                               | Purpose                                                                                                                                                      |
| -------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PreToolUse` (Bash)        | `hooks/scripts/glab-read-guard.mjs`  | Deny a `glab api -X GET` read that also sets another method or body fields, so skills' pre-approved MR reads never become unprompted writes.                 |
| `PostToolUse` (Write/Edit) | `hooks/scripts/format-lint.mjs`      | Format, then lint each file Claude edits with the repo's configured tools.                                                                                   |
| `Stop`                     | `hooks/scripts/format-lint-repo.mjs` | Format, then lint the whole repo with the same tools, per file type, only when that type's files changed; blocks Claude until errors and warnings are fixed. |

### Example

In a Claude Code session inside your repository:

```text
/cdk:write-readme score
```

Claude scores the existing `README.md` against the 100-point rubric and prints a per-criterion table with deductions. Score mode never writes files.

## Configuration

No configuration.

## Development

```sh
npm install                        # also installs Husky git hooks via prepare
npm run format
npm run lint                       # eslint, markdownlint-cli2, yamllint, yamlfmt, prettier
claude plugin validate --strict .
claude plugin eval .               # LLM-graded eval suite in evals/; manual only, not run by hooks
claude --plugin-dir .              # test local checkout; /reload-plugins after edits
```

## Contributing

- Commits: signed, Conventional Commits subject only, ≤72 characters. Husky `commit-msg` runs commitlint; check a message with `npx commitlint --edit <file>`.
- Branches: `<type>/<short-description>`.
- Never bypass hooks with `--no-verify`.
- Open pull requests with the [default template](.github/pull_request_template.md).

## License

[MIT](LICENSE) © 2026 Patrick Quijano
