# Principles

- Verify each fact vs official docs or code before stating/using.
- Missing/ambiguous info → ask user w/ options, recommendation, why; no assume.
- Failed check → find root cause, fix, re-run check until pass.
- Comments brief: max 2 sentences.
- Review, validate, test each changed component before commit, using `Verify:` line in its `.claude/rules/` file.
- Verify: Definition of done checklist in `.claude/CLAUDE.md`.

## Design principles

- DRY: reuse existing; extract shared code on third occurrence (rule of three); prefer duplication over wrong abstraction.
- YAGNI: build only what needed now.
