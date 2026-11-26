# Hooks

## Contents

- Events (step 5) · Copy (step 9) · Commitlint config (step 10) · Smoke test (step 15)

Commands run by name from `commands.md`.

## Events

Existing asset stubs map back to a choice: commit-msg stub without `--skip-message` → message on, else off; commit-msg stub without `--skip-signing` → pre-check on; post-commit stub → report on; a missing stub turns its part off. Either asset stub exists → reuse that choice. Else, no question. The step 5 foreign hook-owner and `core.hooksPath` checks (`init.md`) already ran before any question here:

- Commit message check: commit-msg (the only hook that gets the final message file as `$1` and can block before the commit exists).
- Signed check: commit-msg pre-check + post-commit report (commit-msg blocks on missing signing config; post-commit confirms the real signature).
- Stub flags: message skipped → `--skip-message`; signing pre-check not chosen → `--skip-signing`; step 3 asked the user → `--pm=<pm>`, because run-time detection could pick another lockfile's manager. commit-msg stub = `node .husky/commit-msg.mjs <flags> "$@"`; both checks off commit-msg → no commit-msg hook. post-commit report chosen → post-commit hook. Message skipped → also skip the commitlint packages (step 6), config (step 10), and commit rules (step 11). Both checks skipped → nothing to install but Husky.
- Signing pre-check chosen: the hook blocks commits when `commit.gpgsign` is not `true`, `user.signingkey` is unset, or (`gpg.format` = `ssh`) `gpg.ssh.allowedSignersFile` is unset. Any of `gpgsign` not `true`, `signingkey` empty, or `gpg.format` = `ssh` with `allowed-signers` empty, missing, or not listing the signing public key → AskUserQuestion: Skip the signing pre-check (Recommended; adds `--skip-signing`, the post-commit report stays, and the `Open:` list notes it) | Stop (commits would be blocked until signing is configured). Stop → `Stopped: 5: signing not configured`. `--yes`: skip the pre-check and list under `Open:`.
- Pending questions: ask every remaining question here, before any write, so steps 9 and 10 only apply the answers. Asset hook (`commit-msg`, `post-commit`) present but not chosen → AskUserQuestion: Remove (Recommended; it would keep running) | Keep; no unchosen hook → no question; a hook that differs from its asset is a user file and is kept, so no question. Message check not skipped and an existing commitlint config whose `header-max-length` rule has a different value (JSON, YAML, or `package.json` key) → AskUserQuestion: Set 72 (Recommended; matches the commit rules) | Keep. `--yes`: keep the hook and keep the config value, since `--yes` never deletes a file (Rules), and list both under `Open:`. Headless (no user to reply) without `--yes`: write nothing, `Result: stopped`, `Stopped: 5: cannot interact`.

## Copy

Source `${CLAUDE_SKILL_DIR}/assets/`, target `<package dir>/.husky/`. Git runs hooks from the git root, so when `<pkg>` ≠ `.`, replace `.husky/` in each stub with `<pkg>/.husky/`; the `.mjs` resolves its own package dir. Add the step 5 flags to the commit-msg stub. For each hook chosen in step 5 and its `.mjs` (`commit-msg`, `commit-msg.mjs`, `post-commit`, `post-commit.mjs`): absent → copy; identical → skip; differs → keep the existing file (user-authored; drops the step 5 choice for that hook) and report the diff and how to overwrite (delete it, then rerun). Asset hook present but not chosen in step 5 → apply the step 5 answer (Remove deletes it; Keep, including under `--yes`, leaves it). On macOS/Linux `chmod-exec` each copied stub.

## Commitlint config

Any `commitlint.config.*`, `.commitlintrc`, `.commitlintrc.*`, or `commitlint` key in `package.json` in package dir → keep it; the hook uses it, then enforce header ≤72 in it. JSON or YAML config (or `package.json` key) with no `header-max-length` rule → append `"header-max-length": [2, "always", 72]` under `rules`, keeping everything else. Rule with a different value → apply the step 5 answer (Set 72 rewrites the value; Keep, including under `--yes`, leaves it). JS or TS config → report only; the hook's own header check still holds the limit. No config → copy `${CLAUDE_SKILL_DIR}/assets/commitlintrc.json` to `.commitlintrc.json`: Conventional Commits, header ≤72, no `Co-authored-by`. The hook adds its own header-length and imperative-mood checks on top, so 72 holds even without the config rule.

## Smoke test

From the git root, run each check below with the stub's flags; with `--skip-message` still write the file but skip both message expectations. Write `feat: add husky hooks` to a file in the OS temp dir and run `smoke-commit-msg`; expect `✅ Commit Message` and `✅ Header Length`. Repeat with `feat: added husky hooks`; expect `❌ Commit Message` (imperative check). Repeat with `feat: add` plus a space and 63 `x` characters (73-char header); expect `❌ Header Length`. Pass the stub's flags before `<file>`. Delete the temp file. Report the `Signed` line as printed; `❌ Signed` shows why commits stay blocked.
