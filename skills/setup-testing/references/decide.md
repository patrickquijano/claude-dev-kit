# Decide

Details step 3 of `${CLAUDE_SKILL_DIR}/SKILL.md`.

- One question per missing tool (runner, faker library, e2e framework, browsers), never per package when the answer is the same: ask once and apply to every package of that stack.
- Options: the stack's Recommended tester from stacks.md first, "(Recommended)" plus its reason (for example "Vitest: native ESM and TypeScript, no transform config"), then at most two alternatives from stacks.md, then Stop.
- A kind whose tester already exists (any state other than `missing`) is never asked about; `unconfigured` goes straight to step 5.
- Integration without Docker: no question; report that it falls back to HTTP stubs and in-memory fakes per conventions.md Integration.
- e2e for a package with no UI, API, or CLI entry point → skip the kind and say so in the table.
- Missing info the analyzer returned as `Questions:` (several fitting testers) is asked here with the same options.
