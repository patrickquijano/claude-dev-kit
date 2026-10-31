# Plan mode

Detail for the plan-mode entry in step 1 of `SKILL.md`.

## Plan mode

Runs once, after pre-flight. `--no-plan` or `--yes` → `Plan mode: skipped (--no-plan | --yes)`; any other unattended run → `Plan mode: skipped (unattended)`.

- Plan mode already active → `already active`. Otherwise load `EnterPlanMode` with ToolSearch if deferred, then call it. Declined or unavailable → `Result: stopped`, `Stopped: 0: plan mode declined`; nothing is installed or written.
- Steps 2-4 run inside plan mode: they read, run read-only version lookups, research, and ask.
- End of step 5: write the plan file with the resolved versions, every install, every file written or overwritten, each backup, the scratch dir and the files moved from it, each choice with its grill row, the research URLs, and anything marked `unverified`. `ExitPlanMode` approval covers the first write.
- **Each fix round** (verify loop and red-flag pass). Before applying round k, enter plan mode, list each item (cause, options, chosen fix) and the files it touches, then `ExitPlanMode`; apply only what was approved. `--no-plan` → ask `Apply` | `Stop` instead. Declined, `--yes`, or unattended → no fix; items go under `Open:`.
- Rejection → revise and call `ExitPlanMode` again; 3 rejections → `Result: cancelled`, `Stopped: <step>: plan rejected` with the step of that gate (5 for the plan, 13 or 14 for a fix round).
- Any end before step 6 prints the Output with `Plan mode:` as reached.
