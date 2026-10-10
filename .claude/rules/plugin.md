---
paths:
  - '.claude-plugin/**'
---

# Plugin

- Only `plugin.json` + `marketplace.json` in `.claude-plugin/`. Components (`skills/`, `agents/`, `hooks/`, `.mcp.json`) at plugin root.
- `name` required, kebab-case; prefixes every component (`/cdk:<skill>`).
- Bump `version` every release; installs stay pinned to version got. `.claude/hooks/version-bump.mjs` does it before each PR/MR into `main` (`plugin.json` wins over a marketplace entry `version`; keep both equal if the entry sets one); never bump by hand.
- Use `${CLAUDE_PLUGIN_ROOT}` for paths in plugin; never hard-code absolute paths.
- Verify: `plugin-dev:plugin-validator` agent + `claude plugin validate --strict .`.
- Docs: <https://code.claude.com/docs/en/plugins-reference>
