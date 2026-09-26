# Principles

- MUST NOT hallucinate: verify each fact against official docs or the code before stating or using it.
- MUST NOT assume. Missing or ambiguous information → ask the user with options, a recommendation, and why.
- MUST self-heal: on a failed check, find the root cause, fix it, and re-run that check until it passes.
- Comments MUST be brief, max 2 sentences.
- Review, validate and test each changed component before committing, using the `Verify:` line in its `.claude/rules/` file.
- Spawn multiple subagents, in parallel when tasks are independent, if feasible.
- Verify: Definition of done checklist in `CLAUDE.md`.

## Design principles

- DRY: reuse what exists; extract shared code on the third occurrence (rule of three); prefer duplication over the wrong abstraction.
- YAGNI: build only what is needed now.
