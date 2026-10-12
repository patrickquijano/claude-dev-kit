# Detect

Details step 2 of `${CLAUDE_SKILL_DIR}/SKILL.md`; commands by name in `${CLAUDE_SKILL_DIR}/references/commands.md`.

- git: `gpgsign` is `true` and `signingkey` is set, plus `.gitignore` exists → configured; one of the two → partial; neither, or not a git repo → missing.
- EditorConfig: `.editorconfig` with `root = true` and a `[*]` section → configured; file without either → partial.
- Formatters and linters: any config the `setup-format-lint` catalog (`${CLAUDE_SKILL_DIR}/../setup-format-lint/references/tools.md`) lists exists → partial (a re-run fills missing roles); none → missing. Never report it as configured.
- Husky: `.husky/commit-msg` or `.husky/post-commit` at the root or in a `package.json` dir → configured; `.husky/` without them → partial.
- Test hook: `.claude/settings.json` `hooks.Stop` has a command running `run-tests.mjs` or a test runner → configured.
