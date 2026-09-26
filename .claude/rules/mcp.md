---
paths:
  - '.mcp.json'
---

# MCP servers

- Declare plugin MCP servers in `.mcp.json` at the plugin root under `mcpServers`.
- Use `${CLAUDE_PLUGIN_ROOT}` for bundled binaries/configs; `${VAR:-default}` for env.
- Never commit secrets; read credentials from env vars or `headersHelper`.
- Prefer `stdio` for local servers and `http` for remote; `sse` is deprecated.
- Tools are exposed as `mcp__plugin_cdk_<server>__<tool>`.
- Test with `/mcp` before committing.
- Docs: <https://code.claude.com/docs/en/mcp>
