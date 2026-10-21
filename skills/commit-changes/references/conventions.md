# Git conventions

A repo commitlint config wins over these rules.

## Commit subject

- Format: `<type>(<optional scope>): <subject>`. Max 72 chars. Imperative ("add", not "added"). Lowercase subject, no trailing period.
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- Subject line only: no body, no footer, no attribution (`Co-Authored-By`, "Generated with").

## Branch name

- Format: `<type>/<short-description>`, types as above.
- Whole name (incl. `<type>/`) max 72 chars. Imperative verb first in description ("add-", not "added-"). Lowercase, hyphen-separated, `[a-z0-9-]` only.
- Exists locally or on the remote → append `-2`, `-3`, …, truncating the base so base + suffix stays at most 72 chars.

## Protected branch

Host from `origin-url`; run the `commands.md` rows verbatim:

- gitlab → `protected-gitlab`; match `.[].name`, names may be globs (`release/*`).
- github → `protected-github` = `true`.
- CLI missing, any API error (401/403/404), or other host → protected = `main`, `master`, `develop`, `release/*`.
- Default branch and detached `HEAD` count as protected.

## Signing

- `signing-key` set.
- `signing-format` = `ssh` → `signing-signers-file` set, that file exists (`~` expanded), and it contains the signing public key: `user.signingkey` itself when it starts `ssh-`/`ecdsa-`/`sk-` (strip `key::`), else the first two fields of `<key>.pub` (or the key file when it ends `.pub`).
- `.husky/` exists → also `signing-gpgsign` = `true` (hook enforces it).
- Missing or mismatch → stop, tell user what to set. Commit, rebase, or hook fails on signing → stop, tell user the exact error line. Never edit signing config (git config, keys, allowed signers file) or retry unsigned.
