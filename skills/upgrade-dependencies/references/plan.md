# Plan

Details plan mode and step 6 of `${CLAUDE_SKILL_DIR}/SKILL.md`.

## Plan mode

Runs once, right after pre-flight passes. Unattended (subagent or print mode) → `Plan mode: skipped (unattended)`; a pre-flight stop → `skipped (pre-flight stop)`.

- Plan mode already active → `already active`, stay in it. Otherwise load `EnterPlanMode` with ToolSearch if it is deferred, then call it. The user declines it, or the tool is unavailable → `declined`, `Result: stopped`, `Stopped: 1: plan mode declined`; nothing is edited or installed.
- Steps 2–6 run inside plan mode: tool-check, the resolver and researcher spawns, the select and major asks. They only read and ask. The step 7 baseline and every later step run after approval.
- At the end of step 6 write the plan file: the projects, each package with current → new version and bump, the planned edits per file, the majors, each marked Apply (the user edits one to Skip before approving), the effects (manifest and lockfile changes, the install and check commands that run), and the high-risk notes. Call `ExitPlanMode`.
- Approval → step 7; it covers the patch and minor batch and every major still marked Apply, which then apply unasked. Rejection → revise per the feedback and call `ExitPlanMode` again; a change to the selection reruns step 6 for the changed packages first; 3 rejections → `Result: cancelled`, `Stopped: 6: plan rejected`.
- An end before step 7 (`nothing-to-do`, nothing selected, every major marked Skip or declined and no patch or minor selected) prints the Output with `Plan mode:` as reached; plan mode stays as it is, and `Open:` notes that plan mode is still active and must be exited before edits. A stop or cancel while plan mode is active does the same.

## Step 6

1. Spawn one read-only researcher subagent per selected major (and minor with breaking changes), at most 4 per message, in batches until all are done. Scope: the `Breaking:` URLs and `Affects:` hits. Its `Answer:` is the required edit per file.
2. Check each edit against Grep hits for the package's API in the repo. Drop an edit with no hit or one that targets another file; print the rest.
3. Patch and minor edits apply without asking.
4. Each major's edits → the plan file marks it Apply and the user edits it to Skip at approval; there is no separate question. Skipped → `Skipped:` and `Open:`.
