# Validate and revert

Details steps 8-9 of `${CLAUDE_SKILL_DIR}/SKILL.md`; commands by name in `commands.md`.

A failure, error, or deprecation warning not in the baseline → find the root cause in the changelog or migration guide, then run the fix round per **Plan mode (each round)** below, then re-spawn the check-runner subagent (`spawns.md`). Still failing after 3 fix rounds → revert this package (keeps the rest green), report it, and continue with the next.

**Plan mode (each round).** Before applying round k's fixes, call `EnterPlanMode` (load it with ToolSearch if deferred). Put the round's items (cause, chosen fix) and the files each touches in the plan, then `ExitPlanMode`. Apply only what was approved. Plan mode already active → write the plan to its plan file. Rejection → revise and call `ExitPlanMode` again, at most 3 times → `Result: cancelled`, `Stopped: 9: plan rejected`. Declined, unavailable, or unattended → no fix is applied; revert the package as below and list its failures under `Open:`.

Revert: restore the recorded specifier in its manifest exactly (not `<pkg>@<old version>`, which can turn `~` or an exact pin into `^`), run the manager's install or lock command, and undo that step's code and config edits with `restore-files` from the package's `checkpoint` for each file the step changed (the checkpoint holds earlier upgrades, so they stay). Never `git checkout`, `git stash apply`, or `git reset`.
