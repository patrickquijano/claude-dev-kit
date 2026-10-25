# Plan mode

Detail for the plan-mode entry after step 1 of `SKILL.md`.

## Plan mode

Runs once, right after pre-flight passes. Unattended (no way to ask) → `Plan mode: skipped (unattended)`.

- Plan mode already active → `already active`, stay in it. Otherwise load `EnterPlanMode` with ToolSearch if it is deferred, then call it (→ `entered`). The user declines it, or the tool is unavailable → `declined`, `Result: stopped`, `Stopped: 5: plan mode declined`; nothing is installed or written.
- Steps 2–5 run inside plan mode: they only read, ask with AskUserQuestion, and run the read-only commands (`hooks-path`, package manager detection). The step 4 `package.json` creation moves after approval; a missing one is only noted.
- At the end of step 5 write the plan file: the installs (packages), the files to write (`package.json` when missing, hooks, commitlint config, `.claude/rules/commits.md`, `.gitignore`, `.gitattributes`, tool ignores), the `prepare` merge, the effects (`husky-init`, `run-prepare`, the smoke test commits nothing), and any other hook owner or foreign `core.hooksPath` found by the read-only checks in `init.md` (replacing it is an effect). Call `ExitPlanMode`; approval covers all of it, then create the missing `package.json` and continue at step 6.
- A kept user file is never replaced; it is reported at its step.
- Rejection → revise per the feedback and call `ExitPlanMode` again; 3 rejections → `Result: cancelled`, `Stopped: 5: plan rejected`.
- Any end before step 6 prints the Output with `Plan mode:` as reached (`skipped (<reason>)` when never entered).
