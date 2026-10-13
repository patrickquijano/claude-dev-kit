# Branch conventions

A repo commitlint config wins over these rules. The `cdk:change-analyzer` agent reads this file.

## Branch name

- Format: `<type>/<short-description>`; types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- The whole name (including `<type>/`) is at most 72 chars: imperative verb first ("add-", not "added-"), lowercase, hyphen-separated, `[a-z0-9-]` only.
- The name exists locally or on the remote → append `-2`, `-3`, ….
- Naming: the input wins; otherwise weigh the type, scope, and intent of the commits unique to the current branch and the uncommitted changes together.
