# Git

## Branches

- Branch names: max 72 chars.

## Push

- Never bare `--force`; never force-push `main`.
- Rewritten history: push with an explicit lease (`--force-with-lease=<branch>:<pre-rewrite sha>`) after explicit confirmation; `cdk:rebase-onto` does this.

## Git hooks

- Never bypass hooks with `--no-verify` or local `HUSKY=0`; `HUSKY=0` CI only.
- Verify: `git log --show-signature -1`.
