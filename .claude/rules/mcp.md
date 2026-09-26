---
paths:
  - '.mcp.json'
---

# MCP servers

- Declare plugin MCP servers in `.mcp.json` at the plugin root under `mcpServers`.
- Use `${CLAUDE_PLUGIN_ROOT}` for bundled binaries/configs; `${VAR:-default}` for env.
- Read credentials from env vars or `headersHelper` only.
- Prefer `stdio` for local servers and `http` for remote; `sse` is deprecated.
- Verify: `/mcp` shows server connected and tools listed.
- Docs: <https://code.claude.com/docs/en/mcp>
