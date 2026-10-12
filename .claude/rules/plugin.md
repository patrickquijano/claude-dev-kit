---
paths:
  - '.claude-plugin/**'
---

# Plugin

- Only `plugin.json` + `marketplace.json` in `.claude-plugin/`. Components (`skills/`, `commands/`, `agents/`, `hooks/`, `.mcp.json`) at plugin root.
- `name` required, kebab-case; prefixes every component (`/cdk:<skill>`).
- Bump `version` in every PR that changes shipped components, to the SemVer level its commits require, via `cdk:bump-version`, which asks first (`.claude/rules/release.md`); installs stay pinned to the version they got.
- Use `${CLAUDE_PLUGIN_ROOT}` for paths in plugin; never hard-code absolute paths.
- Verify: `plugin-dev:plugin-validator` agent.
- Docs: <https://code.claude.com/docs/en/plugins-reference>
