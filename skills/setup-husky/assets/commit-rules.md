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
- Body and footer are optional; keep them short (config-conventional limits apply).
- No `Co-` trailer such as `Co-Authored-By` (the hook rejects any trailer starting `Co-`); also leave out "Generated with" lines (not enforced).
- Signed and verified; check with `git log --show-signature -1`.
- Atomic: one logical change per commit, related files grouped.
- Never commit secrets or credentials; read them from environment variables.

## Branches

- Conventional Branch: `<type>/<short-description>` (e.g. `feat/add-login`).
- Max 72 characters.
- Imperative, lowercase, hyphen-separated.

## Git hooks

- Never bypass hooks with `--no-verify` or a local `HUSKY=0`; `HUSKY=0` is for CI only.
