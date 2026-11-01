# Plan

Detail for the plan printed after step 1 of `SKILL.md`.

## Plan

Runs once, right after pre-flight passes.

- Run only the read-only state checks of steps 2–5 first: `has-graphify`, `state` (a pre-check; step 3 runs it again), and `hook-status` (skipped when the CLI is missing; its git hooks are then listed as planned). No install, no write.
- Print the plan: the planned writes (the global install when the CLI is missing, the skill, the Claude and git hooks, the graph build, `label-missing` (spends LLM tokens and rewrites names in `graphify-out/`), `.gitignore` with the replacement of an existing `graphify-out/` line when present, ignore files, `.claude/rules/graphify.md`, the step 8 lint and format config edits), each with its purpose and effect, and what is already present and skipped. Then continue at step 2 with no wait.
