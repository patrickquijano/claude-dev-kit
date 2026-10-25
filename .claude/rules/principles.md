# Principles

- Before stating a command, path, or API, confirm it with Grep/Read of the repo or the official docs.
- Missing info → AskUserQuestion with the recommended option first; never guess.
- Failed check → fix, then re-run the same command until it exits 0.
- Comments: max 2 sentences.
- Verify: Definition of done checklist in `.claude/CLAUDE.md`.

## Design principles

- DRY: extract shared code on the third occurrence; prefer duplication over wrong abstraction.
- YAGNI: every new abstraction has a caller in the same change.
- Security: validate untrusted input at trust boundaries.
- Behavior: fail fast; errors bubble to `runIfMain` in `hooks/scripts/lib/hook-io.mjs`; catch rules in `.claude/rules/es-modules.md`.
- Observability: no logger; error output per `.claude/rules/hooks.md` Error policy.
- Maintainability: tidy only lines the change already edits; record larger cleanups as tech debt in an issue instead of fixing them in the same change.
- Add a pattern only for a problem the code shows now, named in the change; avoid overengineering, indirection, and unneeded dependencies.
