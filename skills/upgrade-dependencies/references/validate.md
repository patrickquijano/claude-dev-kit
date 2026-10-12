# Validate

Details step 9 of `${CLAUDE_SKILL_DIR}/SKILL.md`; commands by name in `${CLAUDE_SKILL_DIR}/references/commands.md`.

A failure, error, or deprecation warning not in the baseline → find the root cause in the changelog or migration guide, fix it, re-run the check. Still failing after 3 fix rounds → revert this package (keeps the rest green), report it, and continue with the next. Revert → restore the recorded specifier in its manifest exactly (not `<pkg>@<old version>`, which can turn `~` or an exact pin into `^`), run the manager's install or lock command, and undo that step's code and config edits (not `git checkout`, which also drops earlier upgrades).
