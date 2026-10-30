# Git conventions

A repo commitlint config wins over these rules.

## Commit subject

- Format: `<type>(<optional scope>): <subject>`. Max 72 chars. Imperative ("add", not "added"). Lowercase subject, no trailing period.
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- Subject line only: no body, no footer, no attribution (`Co-Authored-By`, "Generated with").

## Protected branch

Host from `origin-url`; run the `commands.md` rows verbatim:

- gitlab → `protected-gitlab`; match `.[].name`, names may be globs (`release/*`).
- github → `protected-github` = `true`.
- CLI missing, any API error (401/403/404), or other host → protected = `main`, `master`, `develop`, `release/*`.
- Default branch and detached `HEAD` count as protected.

## Signing

- `check-signing` verifies the signing key, the SSH allowed signers file holding that key (for `gpg.format` = `ssh`), and `commit.gpgsign` = `true` when `.husky/` exists. Exit 1 → stop, tell the user each error's `fix`.
- Commit, rebase, or hook fails on signing → stop, tell user the exact error line. Never edit signing config (git config, keys, allowed signers file) or retry unsigned.
