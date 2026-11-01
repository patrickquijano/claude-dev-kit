# Plan

Detail for the plan in step 5 of `SKILL.md`.

## Plan

- No way to ask and no `--yes` → write nothing, `Stopped: 0: cannot interact`.
- End of step 5: print the plan with the resolved versions, every install, every file written or overwritten, each backup, the scratch dir and the files moved from it, each choice with its grill row, the research URLs, and anything marked `unverified`. Step 6 starts right after, with no wait.
- **Each fix round** (verify loop and red-flag pass). Before applying round k, print each item (cause, options, chosen fix) and the files it touches, then apply the fixes.
