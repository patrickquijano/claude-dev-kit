---
paths:
  - '.claude-plugin/**'
---

# Plugin

- Only `plugin.json` and `marketplace.json` go in `.claude-plugin/`. Components (`skills/`, `agents/`, `hooks/`, `.mcp.json`) go at the plugin root.
- `name` is required, kebab-case; it prefixes every component (`/cdk:<skill>`).
- Bump `version` on every release; installs stay pinned to the version they got.
- Use `${CLAUDE_PLUGIN_ROOT}` for paths inside the plugin; never hard-code absolute paths.
- Verify: `plugin-dev:plugin-validator` agent + `claude plugin validate --strict .`.
- Docs: <https://code.claude.com/docs/en/plugins-reference>
