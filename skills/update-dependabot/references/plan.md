# Plan mode

Detail for the plan-mode entry in step 1 of `SKILL.md`.

## Plan mode

Runs once, after pre-flight. `--no-plan` or `--yes` → `Plan mode: skipped (--no-plan | --yes)`; any other unattended run → `Plan mode: skipped (unattended)`.

- Plan mode already active → `already active`. Otherwise load `EnterPlanMode` with ToolSearch if deferred, then call it. Declined or unavailable → `Result: stopped`, `Stopped: 0: plan mode declined`; nothing is written.
- Steps 2-5 run inside plan mode: they read, ask, and research only.
- End of step 5: write the plan file with the target path, the diff against the existing file (or the whole new file), each stale or invalid key fixed and why, and the research URLs. `ExitPlanMode` approval covers the write.
- **Each fix round.** Before applying round k, enter plan mode, list the failing checks, the cause, and the fix per file, then `ExitPlanMode`; apply only what was approved. Declined or unattended → no fix; failures go under `Open:`.
- Rejection → revise and call `ExitPlanMode` again; 3 rejections → `Result: cancelled`, `Stopped: 5: plan rejected`.
- Any end before step 6 prints the Output with `Plan mode:` as reached.
