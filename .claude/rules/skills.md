---
paths:
  - 'skills/**'
---

# Skills

- One skill per `skills/<name>/SKILL.md`; `name` matches the directory, kebab-case.
- `description` is the trigger: say what it does and when to use it, key use case first. Description + `when_to_use` max 1,536 chars.
- Keep `SKILL.md` under 500 lines. Move reference material to sibling files and link them (progressive disclosure).
- Set `disable-model-invocation: true` for skills with side effects that should only run on `/` command.
- Pre-approve only the tools the skill needs with `allowed-tools`.
- Use `$ARGUMENTS` / `${CLAUDE_SKILL_DIR}` substitutions instead of hard-coded paths.
- Review with the `plugin-dev:skill-reviewer` agent after changes.
- Docs: <https://code.claude.com/docs/en/skills>
