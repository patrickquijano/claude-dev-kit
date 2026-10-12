# Hook events

Step 5 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

Existing asset stubs map back to a choice: commit-msg stub without `--skip-message` → message on, else off; commit-msg stub without `--skip-signing` → pre-check on; post-commit stub → report on; a missing stub turns its part off. Either asset stub exists → reuse that choice. Else, no question:

- Commit message check: commit-msg (the only hook that gets the final message file as `$1` and can block before the commit exists).
- Signed check: commit-msg pre-check + post-commit report (git can verify a signature only after the commit object exists, so commit-msg blocks on missing signing config and post-commit confirms the real signature).
- Stub flags: message skipped → `--skip-message`; signing pre-check not chosen → `--skip-signing`; step 3 asked the user → `--pm=<pm>`, because run-time detection could pick another lockfile's manager. commit-msg stub = `node .husky/commit-msg.mjs <flags> "$@"`; both checks off commit-msg → no commit-msg hook. post-commit report chosen → post-commit hook. Message skipped → also skip the commitlint packages (step 6), config (step 10), and commit rules (step 11). Both checks skipped → nothing to install but Husky.
- Signing pre-check chosen: the hook blocks commits when `commit.gpgsign` is not `true`, `user.signingkey` is unset, or (`gpg.format` = `ssh`) `gpg.ssh.allowedSignersFile` is unset. Any of `gpgsign` not `true`, `signingkey` empty, or `gpg.format` = `ssh` with `allowed-signers` empty, missing, or not listing the signing public key → stop ("run /cdk:setup-git first"; commits would be blocked), no question.
