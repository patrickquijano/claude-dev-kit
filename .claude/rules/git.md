# Git

## Commits

- Conventional Commits per `.commitlintrc.json`: `<type>(<optional scope>)[!]: <subject>`, header max 72 chars (never raise it), imperative, lowercase, no trailing period.
- Subject line only: no body, no footer, no attribution (`Co-Authored-By`, "Generated with").
- Commits and tags are signed; never `--no-gpg-sign`. A signing failure → stop and report the exact error line; never edit signing config or retry unsigned.

## Branches

- Conventional Branch: `<type>/<short-description>` with the commit types, imperative verb first, lowercase `[a-z0-9-]`, whole name max 72 chars.
- Protected: `main`, `master`, `develop`, `release/*`, and the default branch.

## Push

- Never bare `--force`; never force-push `main`.
- Rewritten history: push only with `--force-with-lease=<branch>:<pre-rewrite sha> --force-if-includes`, only when the upstream is `origin/<branch>`, after explicit confirmation.
- A rejected or failed push: report its exact error line; never retry or force it.

## Pull requests

- Title: `<type>(<scope>)[!]: <description>`; body fills `.github/pull_request_template.md`. No attribution and no mention of AI or tools in title or body.
- Merge: squash when allowed; admin bypass only for your own PR, with `ADMIN`, after the user confirms.

## Git hooks

- Never bypass hooks with `--no-verify` or local `HUSKY=0`; `HUSKY=0` CI only.
- Verify: `git log --show-signature -1`.
