# Git

## Commits

- MUST follow Conventional Commits: `<type>(<optional scope>): <subject>`.
- MUST be at most 72 characters.
- MUST be imperative ("add", not "added").
- MUST be a subject line only: no body, no footer.
- MUST NOT contain attribution (no `Co-Authored-By`, no "Generated with").
- MUST be signed and verified (SSH signing is configured locally; check with `git log --show-signature -1`).
- MUST be atomic: one logical change per commit, related files grouped together.
- Never commit secrets or credentials; read them from env vars.

## Branches

- MUST follow Conventional Branch: `<type>/<short-description>` (e.g. `feat/add-build-skill`).
- MUST be at most 72 characters.
- MUST be imperative, lowercase, hyphen-separated.

## Git hooks

- MUST NOT bypass hooks with `--no-verify` or a local `HUSKY=0`; `HUSKY=0` is for CI only.
- Verify: `npx commitlint --edit <file>`, then `git log --show-signature -1` after commit.
