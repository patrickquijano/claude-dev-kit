# Smoke test

Step 15 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

From the git root, run each check below with the stub's flags; with `--skip-message` still write the file but skip both message expectations. Write `feat: add husky hooks` to a file in the OS temp dir and run `smoke-commit-msg`; expect `✅ Commit Message` and `✅ Header Length`. Repeat with `feat: added husky hooks`; expect `❌ Commit Message` (imperative check). Repeat with `feat: add` plus a space and 63 `x` characters (73-char header); expect `❌ Header Length`. Pass the stub's flags before `<file>`. Delete the temp file. Report the `Signed` line as printed; `❌ Signed` shows why commits stay blocked.
