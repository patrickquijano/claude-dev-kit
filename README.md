# cdk — Claude Dev Kit

Claude Code plugin providing a development kit — skills, custom agents, and hooks — for any framework or language.

Adds guided Git and GitLab workflows (signed atomic commits, rebases, merge requests, reviews) plus skill, README, and CLAUDE.md authoring with scored rubrics, so Claude follows the same conventions in every repository.

> **Status:** experimental (v0.1.0). Skills, names, and behavior may change without notice.

## Compatibility

- [Claude Code](https://code.claude.com/docs) CLI (`claude`).
- Git; commit, rebase, and review-address skills sign commits when signing is configured.
- [`glab`](https://gitlab.com/gitlab-org/cli) CLI, authenticated, for the merge request skills.
- [`uv`](https://docs.astral.sh/uv/) for `/cdk:setup-spec-kit` when `specify` is not installed.
- Development only: Node.js with npm, `yamllint` and `yamlfmt` on `PATH`; `hadolint` optional (hook lints Dockerfiles when present).

## Install

```sh
claude plugin marketplace add https://gitlab.com/patrickquijano/claude-dev-kit.git
claude plugin install cdk@claude-dev-kit
```

## Components

### Skills

| Skill                               | Purpose                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `/cdk:address-merge-request-review` | Fix MR review threads with new commits, reply, resolve agreed threads, re-request review.    |
| `/cdk:assess-spec-kit-idea`         | Assess an idea with Spec Kit intake to decide; go hands off to run-spec-kit.                 |
| `/cdk:build-skill`                  | Interview, then create or update a skill, orchestrator + subagents, or subagent.             |
| `/cdk:commit-changes`               | Group changes into atomic, signed Conventional Commits, leave protected branches, push.      |
| `/cdk:fix-spec-kit-bug`             | Extract bug evidence, run Spec Kit assess, fix, test; retry fix until verified (max 3).      |
| `/cdk:rebase-onto`                  | Fetch, pick a target branch, rebase with signed commits, resolve conflicts with you.         |
| `/cdk:review-merge-request`         | Review a GitLab MR; post labeled comments, resolve addressed own threads, approve and merge. |
| `/cdk:run-spec-kit`                 | Split a feature brief, run Spec Kit from constitution to converge, gate before implement.    |
| `/cdk:setup-spec-kit`               | Install Spec Kit, init with Claude, add agent-context/assess/bug extensions, set ignores.    |
| `/cdk:submit-merge-request`         | Create or update a GitLab MR with template, reviewers, delete-source and squash options.     |
| `/cdk:switch-branch`                | Derive a Conventional Branch name from changes, switch to it, push.                          |
| `/cdk:write-claude-md`              | Merge input guidelines into CLAUDE.md and `.claude/rules`, score it /100, iterate until ≥95. |
| `/cdk:write-readme`                 | Create or update README.md from templates, score it /100, iterate until ≥95.                 |

### Agents

Spawned by skills; not meant for direct use.

| Agent                    | Purpose                                                                       |
| ------------------------ | ----------------------------------------------------------------------------- |
| `cdk:claude-md-analyzer` | Extract, dedupe, and flag memory-file instructions for `write-claude-md`.     |
| `cdk:claude-md-scorer`   | Score CLAUDE.md and rules against the 100-point rubric for `write-claude-md`. |
| `cdk:mr-reviewer`        | Review an MR diff against guidelines for `review-merge-request`.              |
| `cdk:readme-analyzer`    | Collect repo facts and guess README archetype for `write-readme`.             |
| `cdk:readme-scorer`      | Score README against the 100-point rubric for `write-readme`.                 |

### Hooks

| Event                      | Script                          | Purpose                                                                    |
| -------------------------- | ------------------------------- | -------------------------------------------------------------------------- |
| `PostToolUse` (Write/Edit) | `hooks/scripts/format-lint.mjs` | Format, then lint each file Claude edits with the repo's configured tools. |

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
claude plugin eval .               # eval suite in evals/
claude --plugin-dir .              # test local checkout; /reload-plugins after edits
```

## Contributing

- Commits: signed, Conventional Commits subject only, ≤72 characters. Husky `commit-msg` runs commitlint; check a message with `npx commitlint --edit <file>`.
- Branches: `<type>/<short-description>`.
- Never bypass hooks with `--no-verify`.
- Open merge requests with the [default template](.gitlab/merge_request_templates/Default.md).

## License

[MIT](LICENSE) © 2026 Patrick Quijano
