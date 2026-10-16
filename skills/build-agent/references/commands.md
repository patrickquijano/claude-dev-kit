# Commands

| Name              | Command                                                                           | Purpose                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validate-plugin` | `claude plugin validate --strict .`                                               | Structural check of a plugin root (frontmatter parse, layout); run from the plugin root.                                                                       |
| `check-agent`     | `node ${CLAUDE_SKILL_DIR}/scripts/check-agent.mjs <agent-file> [--scope <scope>]` | Mechanical rules (A1, A2, A3, A7, B1, B2, B4) as JSON `{ok, errors, warnings}`; scope is `personal`, `project`, or `plugin`; exit 0 ok, 1 errors, 2 bad usage. |
