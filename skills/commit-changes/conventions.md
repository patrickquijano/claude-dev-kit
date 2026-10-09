# Git conventions

Shared by `cdk:commit-changes`, `cdk:switch-branch`, `cdk:submit-merge-request`, `cdk:rebase-onto`, `cdk:address-merge-request-review`, `cdk:address-pull-request-review`, `cdk:ship-changes`, `cdk:ship-spec-kit-bug`, and `cdk:ship-spec-kit-idea`. A repo commitlint config wins over these rules.

## Commit subject

- Format: `<type>(<optional scope>): <subject>`. Max 72 chars. Imperative ("add", not "added"). Lowercase subject, no trailing period.
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- Subject line only: no body, no footer, no attribution (`Co-Authored-By`, "Generated with").
- MR titles follow the same rules.

## Branch name

- Format: `<type>/<short-description>`, types as above.
- Whole name (incl. `<type>/`) max 72 chars. Imperative verb first in description ("add-", not "added-"). Lowercase, hyphen-separated, `[a-z0-9-]` only.
- Exists locally or on the remote → append `-2`, `-3`, ….

## Protected branch

Host from `git remote get-url origin`; run commands verbatim:

- gitlab → `glab api --paginate projects/:id/protected_branches`; match `.[].name`, names may be globs (`release/*`).
- github → `gh api repos/{owner}/{repo}/branches/{branch} --jq .protected` = `true`.
- CLI missing, any API error (401/403/404), or other host → protected = `main`, `master`, `develop`, `release/*`.
- Default branch and detached `HEAD` count as protected.

## Signing

- `git config --get user.signingkey` set.
- `git config --get gpg.format` = `ssh` → `git config --get gpg.ssh.allowedSignersFile` set, that file exists (`~` expanded), and it contains the signing public key: `user.signingkey` itself when it starts `ssh-`/`ecdsa-`/`sk-` (strip `key::`), else the first two fields of `<key>.pub` (or the key file when it ends `.pub`).
- `.husky/` exists → also `git config --get commit.gpgsign` = `true` (hook enforces it).
- Missing or mismatch → stop, tell user what to set. Commit, rebase, or hook fails on signing → stop, tell user the exact error line. Never edit signing config (git config, keys, allowed signers file) or retry unsigned.
