# Git

## Commits

The `commit-msg` hook rejects messages that break these rules.

- Conventional Commits: `<type>(<optional scope>): <subject>`.
- At most 72 characters.
- Imperative ("add", not "added").
- Subject line only: no body, no footer.
- No attribution (no `Co-Authored-By`, no "Generated with").
- Signed and verified (SSH signing is configured locally; check with `git log --show-signature -1`).
- Atomic: one logical change per commit, related files grouped together.
- Never commit secrets or credentials; read them from env vars.

## Branches

- Conventional Branch: `<type>/<short-description>` (e.g. `feat/add-build-skill`).
- At most 72 characters.
- Imperative, lowercase, hyphen-separated.

## Git hooks

- Never bypass hooks with `--no-verify` or a local `HUSKY=0`; `HUSKY=0` is for CI only.
- Verify: `npx commitlint --edit <file>`, then `git log --show-signature -1` after commit.
