# Commands

| Name              | Command                                                                                                  | Purpose                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `validate-plugin` | `claude plugin validate --strict <plugin-root>`                                                          | Structural check of a plugin root (frontmatter parse, layout); pass the plugin root path.                                             |
| `check-skill`     | `node ${CLAUDE_SKILL_DIR}/scripts/check-skill.mjs <skill-dir> --kind <task\|reference\|background-only>` | Mechanical rules (F1, F3, F6, F8, B1, B4, B6, B8, B9, Q1, L2, L3) as JSON `{ok, errors, warnings}`; exit 0 ok, 1 errors, 2 bad usage. |
