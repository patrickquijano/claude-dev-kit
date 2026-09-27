# Principles

- Verify each fact against official docs or the code before stating or using it.
- Missing or ambiguous information → ask the user with options, a recommendation, and why; don't assume.
- On a failed check, find the root cause, fix it, and re-run that check until it passes.
- Keep comments brief: max 2 sentences.
- Review, validate and test each changed component before committing, using the `Verify:` line in its `.claude/rules/` file.
- Verify: Definition of done checklist in `CLAUDE.md`.

## Design principles

- DRY: reuse what exists; extract shared code on the third occurrence (rule of three); prefer duplication over the wrong abstraction.
- YAGNI: build only what is needed now.
