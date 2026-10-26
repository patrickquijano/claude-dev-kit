# Plan mode

Detail for the plan-mode entry after step 1 of `SKILL.md`.

## Plan mode

Runs once, right after pre-flight passes. Unattended (no AskUserQuestion) → `Plan mode: skipped (unattended)`.

- Plan mode already active → `already active`, stay in it. Otherwise load `EnterPlanMode` with ToolSearch if it is deferred, then call it. The user declines it, or the tool is unavailable → `declined`, `Result: stopped`, `Stopped: confirm: plan mode declined`; nothing is installed or written.
- Inside plan mode run only the read-only state checks of steps 2–5: `has-graphify`, `state` (a pre-check; step 3 runs it again after approval), and `hook-status` (skipped when the CLI is missing; its git hooks are then listed as planned). No install, no write.
- Write the plan file: the planned writes (the global install when the CLI is missing, the skill, the Claude and git hooks, the graph build, `label-missing` (spends LLM tokens and rewrites names in `graphify-out/`), `.gitignore` with the replacement of an existing `graphify-out/` line when present, ignore files, `.claude/rules/graphify.md`, the step 8 lint and format config edits), each with its purpose and effect, and what is already present and skipped. Call `ExitPlanMode`; approval covers every listed write, including the global install and the line replacement, then continue at step 2.
- Rejection → revise per the feedback and call `ExitPlanMode` again; 3 rejections → `Result: cancelled`, `Stopped: confirm: plan rejected`.
- Any end before the first write prints the Output with `Plan mode:` as reached (`skipped (<reason>)` when never entered).
