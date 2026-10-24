# Validate and revert

Details steps 8-9 of `${CLAUDE_SKILL_DIR}/SKILL.md`; commands by name in `commands.md`.

A failure, error, or deprecation warning not in the baseline → find the root cause in the changelog or migration guide, fix it, re-spawn `cdk:change-verifier`. Still failing after 3 fix rounds → revert this package (keeps the rest green), report it, and continue with the next.

Revert: restore the recorded specifier in its manifest exactly (not `<pkg>@<old version>`, which can turn `~` or an exact pin into `^`), run the manager's install or lock command, and undo that step's code and config edits with `restore-files` from the package's `checkpoint` for each file the step changed (the checkpoint holds earlier upgrades, so they stay). Never `git checkout`, `git stash apply`, or `git reset`.
