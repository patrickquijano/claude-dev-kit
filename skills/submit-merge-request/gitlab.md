# GitLab conventions

Shared by `cdk:submit-merge-request`, `cdk:review-merge-request`, `cdk:address-merge-request-review`, and `cdk:ship-changes`.

## Pre-flight

Run in order; the linking skill names which values it keeps.

1. `glab auth status` fails → stop, tell user `glab auth login`.
2. `glab api projects/:id` fails (origin is not a GitLab project) → report the exact error line, stop. Keep the response (`id`, `path_with_namespace`, `default_branch`, `remove_source_branch_after_merge`, `squash_option`).
3. Self = `glab api user` (`id`, `username`).
4. Root = `git rev-parse --show-toplevel`.
5. Scratch = `mktemp -d` (request bodies, message files, API dumps).

## API reads and writes

- Read MR endpoints only as `glab api -X GET projects/:id/merge_requests/…` or `glab api -X GET --paginate projects/:id/merge_requests/…`; only these prefixes are pre-approved.
- A command that starts with `glab api -X GET` never carries a second `-X`/`--method`; the last method flag wins, so it would turn a pre-approved read into a write.
- Writes (POST, PUT, DELETE, graphql) always start `glab api <endpoint> -X <METHOD>`, never with the `-X GET` prefix, so each one gets a permission prompt as a second confirmation.
- JSON request bodies go to a scratch file and `--input <file>`; never inline user or model text in shell args. `-f`/`-F` only for API-sourced values (SHAs, ids) or fixed literals.
