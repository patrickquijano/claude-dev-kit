# Plan mode

Detail for the plan-mode entry in step 1 of `SKILL.md`.

## Plan mode

Runs once, after pre-flight. `--no-plan` or `--yes` → `Plan mode: skipped (--no-plan | --yes)`; any other unattended run → `Plan mode: skipped (unattended)`.

- Plan mode already active → `already active`. Otherwise load `EnterPlanMode` with ToolSearch if deferred, then call it. Declined or unavailable → `Result: stopped`, `Stopped: 0: plan mode declined`; nothing is written.
- Steps 2-5 run inside plan mode: reading `statusLine`, reading the script, asking, and the plan.
- End of step 5: write the plan file with the target file, the diff of the branch segment, the backup path, the chosen color with its grill row, and the `statusLine` object when creating. `ExitPlanMode` approval covers the backup and the write.
- **Each fix round.** Before applying round k, enter plan mode, list the failing smoke checks, the cause, and the edit, then `ExitPlanMode`; apply only what was approved. Declined or unattended → no fix; failures go under `Open:`, and the backup path is reported so the user can restore.
- Rejection → revise and call `ExitPlanMode` again; 3 rejections → `Result: cancelled`, `Stopped: <step>: plan rejected` with the step of that gate (5 for the plan, 7 for a fix round).
- Any end before step 6 prints the Output with `Plan mode:` as reached.
