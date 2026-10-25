# Plan

Details plan mode and step 6 of `${CLAUDE_SKILL_DIR}/SKILL.md`; the researcher brief is in `spawns.md`.

## Plan mode

Runs once, right after pre-flight passes. Unattended (no way to ask) → `Plan mode: skipped (unattended)`; a pre-flight stop → `skipped (pre-flight stop)`.

- Plan mode already active → `already active`, stay in it. Otherwise load `EnterPlanMode` with ToolSearch if it is deferred, then call it. The user declines it, or the tool is unavailable → `declined`, and keep step 6 below as it is.
- Steps 2–6 run inside plan mode: tool-check, the resolver and researcher spawns, the select and major asks. They only read and ask. The step 7 baseline and every later step run after approval.
- At the end of step 6 write the plan file: the projects, each package with current → new version and bump, the planned edits per file, the majors marked Apply or Skip, the effects (manifest and lockfile changes, the install and check commands that run), and the high-risk notes. Call `ExitPlanMode`.
- Approval → step 7; it covers the patch and minor batch, which then apply unasked. Rejection → revise per the feedback and call `ExitPlanMode` again; 3 rejections → `Result: cancelled`, `Stopped: 6: plan rejected`.
- An end before step 7 (`nothing-to-do`, nothing selected, every major dismissed) prints the Output with `Plan mode:` as reached; plan mode stays as it is.

## Step 6

1. Spawn one `cdk:topic-researcher` per selected major (and minor with breaking changes), at most 4 per message, in batches until all are done. Scope: the `Breaking:` URLs and `Affects:` hits. Its `Answer:` is the required edit per file.
2. Check each edit against Grep hits for the package's API in the repo. Drop an edit with no hit or one that targets another file; print the rest.
3. Patch and minor edits apply without asking.
4. Each major's edits → AskUserQuestion Apply | Skip. Declined → `Skipped:` and `Open:`. Unattended: skip the question and list majors under `Open:`.
