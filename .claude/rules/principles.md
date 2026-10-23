# Principles

- Before stating a command, path, or API, confirm it with Grep/Read of the repo or the official docs.
- Missing info → AskUserQuestion with the recommended option first; never guess.
- Failed check → fix, then re-run the same command (`npm run lint`, `npm test`) until it exits 0.
- Comments: max 2 sentences.
- Verify: Definition of done checklist in `.claude/CLAUDE.md`.

## Working discipline

- Before reporting done, re-run every Definition of done check and quote its exit status.
- Split autonomous work across cdk subagents in one parallel turn (`cdk:task-worker` read-only, `cdk:plan-implementer` edits); never `Explore` or `general-purpose`.

## Design principles

- DRY: extract shared code on the third occurrence; prefer duplication over wrong abstraction.
- YAGNI: every new abstraction has a caller in the same change.
- Security: validate untrusted input at trust boundaries.
- Structure: one entry script per hook event, logic in `hooks/scripts/lib/` (`.claude/CLAUDE.md` Architecture).
- Behavior: fail fast; catch rules in `.claude/rules/es-modules.md`.
- Observability: no logger; error output per `.claude/rules/hooks.md` Error policy.
- Maintainability: tidy only lines the change already edits; record larger cleanups as tech debt in an issue instead of fixing them in the same change.
- Add a pattern only for a problem the code shows now; avoid overengineering, indirection, and unneeded dependencies.
