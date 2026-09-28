---
paths:
  - 'skills/**'
---

# Skills

- One skill per `skills/<name>/SKILL.md`; `name` matches the directory, kebab-case.
- `description` is the trigger: say what it does and when to use it, key use case first. Description + `when_to_use` max 1,536 chars.
- Keep `SKILL.md` under 500 lines. Move reference material to sibling files and link them (progressive disclosure).
- Set `disable-model-invocation` only as the user decides; ask each time a skill is built or updated, recommending `true` for skills with side effects so they run only on `/` command.
- Pre-approve only the tools the skill needs with `allowed-tools`.
- Use `$ARGUMENTS` / `${CLAUDE_SKILL_DIR}` substitutions instead of hard-coded paths.
- Verify: `plugin-dev:skill-reviewer` agent + `claude plugin validate --strict .`; never run the LLM-graded `claude plugin eval`.
- Docs: <https://code.claude.com/docs/en/skills>
