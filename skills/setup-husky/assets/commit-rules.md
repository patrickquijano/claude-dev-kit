---
description: Conventional Commits and Conventional Branch rules for commit messages and branch names.
---

# Commits and branches

## Commits

The `commit-msg` hook rejects messages that break these rules.

- Conventional Commits: `<type>(<optional scope>): <subject>`.
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Header (first line) max 72 characters.
- Imperative subject ("add", not "added").
- Subject only: no body, no footer.
- No attribution (no `Co-Authored-By`, no "Generated with").
- Signed and verified; check with `git log --show-signature -1`.
- Atomic: one logical change per commit, related files grouped.
- Never commit secrets or credentials; read them from environment variables.

## Branches

- Conventional Branch: `<type>/<short-description>` (e.g. `feat/add-login`).
- Max 72 characters.
- Imperative, lowercase, hyphen-separated.

## Git hooks

- Never bypass hooks with `--no-verify` or a local `HUSKY=0`; `HUSKY=0` is for CI only.
