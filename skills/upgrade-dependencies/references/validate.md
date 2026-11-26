# Validate and revert

Details steps 8-9 of `${CLAUDE_SKILL_DIR}/SKILL.md`; commands by name in `commands.md`.

A failure or error not in the baseline → the step 8 implement-spec call already fixed from the changelog or migration guide (`briefs.md` `## Fix-round variant`: no separate fix round); that call runs no linter, so a lint-only new failure is never fixed by it and reverts the package. A check still failing after that call → revert this package (keeps the rest green), report it, and continue with the next.

Revert: first print the package, the specifier to restore, and each file to restore, and do not wait; then restore the recorded specifier in its manifest exactly (not `<pkg>@<old version>`, which can turn `~` or an exact pin into `^`), run the manager's install or lock command, and undo that step's code and config edits with `restore-files` from the package's `checkpoint` for each file the step changed (the checkpoint holds earlier upgrades, so they stay). Record `untracked-files` beside the checkpoint; a file absent from both the checkpoint and that list was created by the step: never delete it, list it under `Open:` as "left in tree; delete to finish the revert". Never `git checkout`, `git stash apply`, or `git reset`.
