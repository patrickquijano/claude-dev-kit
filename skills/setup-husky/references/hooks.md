# Hooks

## Contents

- Events (step 5) · Copy (step 9) · Commitlint config (step 10) · Smoke test (step 15)

Commands run by name from `commands.md`.

## Events

Existing asset stubs map back to a choice: commit-msg stub without `--skip-message` → message on, else off; commit-msg stub without `--skip-signing` → pre-check on; post-commit stub → report on; a missing stub turns its part off. Either asset stub exists → reuse that choice. Else, no question:

- Commit message check: commit-msg (the only hook that gets the final message file as `$1` and can block before the commit exists).
- Signed check: commit-msg pre-check + post-commit report (commit-msg blocks on missing signing config; post-commit confirms the real signature).
- Stub flags: message skipped → `--skip-message`; signing pre-check not chosen → `--skip-signing`; step 3 asked the user → `--pm=<pm>`, because run-time detection could pick another lockfile's manager. commit-msg stub = `node .husky/commit-msg.mjs <flags> "$@"`; both checks off commit-msg → no commit-msg hook. post-commit report chosen → post-commit hook. Message skipped → also skip the commitlint packages (step 6), config (step 10), and commit rules (step 11). Both checks skipped → nothing to install but Husky.
- Signing pre-check chosen: the hook blocks commits when `commit.gpgsign` is not `true`, `user.signingkey` is unset, or (`gpg.format` = `ssh`) `gpg.ssh.allowedSignersFile` is unset. Any of `gpgsign` not `true`, `signingkey` empty, or `gpg.format` = `ssh` with `allowed-signers` empty, missing, or not listing the signing public key → AskUserQuestion: Skip the signing pre-check (Recommended; adds `--skip-signing`, the post-commit report stays, and the `Open:` list notes it) | Stop (commits would be blocked until signing is configured). Stop → `Stopped: 5: signing not configured`. Unattended: skip the pre-check and list under `Open:`.

## Copy

Source `${CLAUDE_SKILL_DIR}/assets/`, target `<package dir>/.husky/`. Git runs hooks from the git root, so when `<pkg>` ≠ `.`, replace `.husky/` in each stub with `<pkg>/.husky/`; the `.mjs` resolves its own package dir. Add the step 5 flags to the commit-msg stub. For each hook chosen in step 5 and its `.mjs` (`commit-msg`, `commit-msg.mjs`, `post-commit`, `post-commit.mjs`): absent → copy; identical → skip; differs → keep the existing file (user-authored; drops the step 5 choice for that hook) and report the diff and how to overwrite (delete it, then rerun). Asset hook present but not chosen in step 5 → AskUserQuestion: Remove (Recommended; it would keep running) | Keep. Unattended: keep it and list under `Open:`; never delete. On macOS/Linux `chmod-exec` each copied stub.

## Commitlint config

Any `commitlint.config.*`, `.commitlintrc`, `.commitlintrc.*`, or `commitlint` key in `package.json` in package dir → keep it; the hook uses it, then enforce header ≤72 in it. JSON or YAML config (or `package.json` key) with no `header-max-length` rule → append `"header-max-length": [2, "always", 72]` under `rules`, keeping everything else. Rule with a different value → AskUserQuestion: Set 72 (Recommended; matches the commit rules) | Keep. JS or TS config → report only; the hook's own header check still holds the limit. No config → copy `${CLAUDE_SKILL_DIR}/assets/commitlintrc.json` to `.commitlintrc.json`: Conventional Commits, header ≤72, no `Co-authored-by`. The hook adds its own header-length and imperative-mood checks on top, so 72 holds even without the config rule.

## Smoke test

From the git root, run each check below with the stub's flags; with `--skip-message` still write the file but skip both message expectations. Write `feat: add husky hooks` to a file in the OS temp dir and run `smoke-commit-msg`; expect `✅ Commit Message` and `✅ Header Length`. Repeat with `feat: added husky hooks`; expect `❌ Commit Message` (imperative check). Repeat with `feat: add` plus a space and 63 `x` characters (73-char header); expect `❌ Header Length`. Pass the stub's flags before `<file>`. Delete the temp file. Report the `Signed` line as printed; `❌ Signed` shows why commits stay blocked.
