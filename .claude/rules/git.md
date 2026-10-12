# Git

## Commits

`commit-msg` hook reject msgs breaking rules.

- Never commit secrets/creds; read from env vars.

## Branches

- Conventional Branch: `<type>/<short-description>` (e.g. `feat/add-build-skill`).
- Max 72 chars.
- Imperative, lowercase, hyphen-separated.

## Push

- Never bare `--force`; never force-push `main`.
- Rewritten history: push with an explicit lease (`--force-with-lease=<branch>:<pre-rewrite sha>`) after explicit confirmation; `cdk:rebase-onto` does this.

## Git hooks

- Never bypass hooks with `--no-verify` or local `HUSKY=0`; `HUSKY=0` CI only.
- Verify: `git log --show-signature -1` (`post-commit` only reports; it does not block).
