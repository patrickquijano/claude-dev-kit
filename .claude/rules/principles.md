# Principles

- Verify each fact vs official docs or code before stating/using.
- Missing/ambiguous info → ask user w/ options, recommendation, why; no assume.
- Failed check → find root cause, fix, re-run the same command (`npm run lint`, `npm test`) until it passes.
- Comments: max 2 sentences.
- Review, validate, test each changed component before finishing the task, using `Verify:` line in its `.claude/rules/` file.
- Verify: Definition of done checklist in `.claude/CLAUDE.md`.

## Design principles

- DRY: reuse existing; extract shared code on third occurrence (rule of three); prefer duplication over wrong abstraction.
- YAGNI: build only what needed now.
- Security: validate untrusted input at trust boundaries; errors never expose secrets or stack traces (`.claude/rules/es-modules.md`).
- Testing: new or changed runtime `.mjs` behavior gets unit tests asserting observable output (`.claude/rules/tests.md`).
- Structure: one responsibility per module; keep entry scripts thin and logic in `hooks/scripts/lib/` (entry script + lib split).
- Behavior: fail fast; pass dependencies through `deps` (injected in unit tests); no swallowed errors (`.claude/rules/es-modules.md`).
- Shared logic lives once: `skills/bump-version/scripts/release-check.mjs` serves the hook, the skill gate, and CI.
- Maintainability: tidy only lines the change already edits; record larger cleanups as tech debt in an issue instead of fixing them in the same change.
- Add a pattern only for a problem the code shows now; avoid overengineering, indirection, and unneeded dependencies.
