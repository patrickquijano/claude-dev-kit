---
paths:
  - 'agents/**'
---

# Subagents

- One subagent per `agents/<name>.md`; `name` unique, kebab-case, no `:`.
- `description` says when to delegate; keep it short (all descriptions share context).
- Restrict `tools` to the minimum; omitting it inherits all tools.
- Set `model` only when needed (`haiku` for cheap lookups, `inherit` otherwise).
- Subagents never get `AskUserQuestion`; on missing info, return the question to the calling skill, which asks the user.
- A subagent spawns subagents only if `tools` includes `Agent` (max 3 layers).
- Plugin agents ignore `hooks`, `mcpServers`, `permissionMode`.
- Return concise results; the parent only sees the final message.
- Verify: `plugin-dev:plugin-validator` agent + `claude plugin validate --strict .`.
- Docs: <https://code.claude.com/docs/en/sub-agents>
