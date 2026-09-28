---
paths:
  - 'skills/**'
---

# Skills

- One skill per `skills/<name>/SKILL.md`; `name` = directory, kebab-case.
- `description` = trigger: what it does + when to use, key use case first. Description + `when_to_use` max 1,536 chars.
- `SKILL.md` under 500 lines. Reference material → sibling files, link them (progressive disclosure).
- `disable-model-invocation` only per user decision; ask each time skill built/updated, recommend `true` for side-effect skills so run only on `/` command.
- Pre-approve only needed tools via `allowed-tools`.
- Use `$ARGUMENTS` / `${CLAUDE_SKILL_DIR}` substitutions, not hard-coded paths.
- Verify: `plugin-dev:skill-reviewer` agent + `claude plugin validate --strict .`; never run LLM-graded `claude plugin eval`.
- Docs: <https://code.claude.com/docs/en/skills>
