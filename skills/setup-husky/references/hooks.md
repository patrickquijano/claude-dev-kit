# Hooks

Step 9 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

Source `${CLAUDE_SKILL_DIR}/assets/`, target `<package dir>/.husky/`. Git runs hooks from the git root, so when `<pkg>` ≠ `.`, replace `.husky/` in each stub with `<pkg>/.husky/`; the `.mjs` resolves its own package dir. Add the step 5 flags to the commit-msg stub. For each hook chosen in step 5 and its `.mjs` (`commit-msg`, `commit-msg.mjs`, `post-commit`, `post-commit.mjs`): absent → copy; identical → skip; differs → keep the existing file (user-authored; drops the step 5 choice for that hook) and report the diff and how to overwrite (delete it, then rerun). Asset hook present but not chosen in step 5 → AskUserQuestion: Remove (Recommended; it would keep running) | Keep. On macOS/Linux `chmod-exec` each copied stub.
