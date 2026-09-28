---
paths:
  - 'agents/**'
---

# Subagents

- One subagent per `agents/<name>.md`; `name` unique, kebab-case, no `:`.
- `description` = when delegate; keep short (all descriptions share context).
- Restrict `tools` to minimum; omit = inherit all tools.
- Set `model` only when needed (`haiku` cheap lookups, `inherit` otherwise).
- Subagents never get `AskUserQuestion`; missing info → return question to calling skill, skill asks user.
- Subagent spawns subagents only if `tools` has `Agent` (max 3 layers).
- Plugin agents ignore `hooks`, `mcpServers`, `permissionMode`.
- Return concise results; parent sees only final message.
- Verify: `plugin-dev:plugin-validator` agent + `claude plugin validate --strict .`.
- Docs: <https://code.claude.com/docs/en/sub-agents>
