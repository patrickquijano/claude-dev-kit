# Conventions

Read by `cdk:change-analyzer` (`## Commit subject`) and by the skill (`## Protected branch`). A repo commitlint config wins over these rules.

## Commit subject

- Format: `<type>(<optional scope>): <subject>`. Max 72 chars. Imperative ("add", not "added"). Lowercase subject, no trailing period.
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- Subject line only: no body, no footer, no attribution (`Co-Authored-By`, "Generated with").

## Protected branch

- GitLab: `glab api --paginate projects/:id/protected_branches`; match `.[].name` (names may be globs such as `release/*`).
- GitHub: `gh api repos/{owner}/{repo}/branches/{branch} --jq .protected` = `true`.
- CLI missing, any API error, or no answer → protected = `main`, `master`, `develop`, `release/*`. The default branch and a detached `HEAD` count as protected.
