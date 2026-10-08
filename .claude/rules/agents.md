---
paths:
  - 'agents/**'
---

# Subagents

- One subagent per `agents/<name>.md`; `name` unique, kebab-case, no `:`.
- `description` = when delegate; keep short (all descriptions share context).
- Read-only by default. Exception: `security-scanner` has `Write` and Docker, for redacted reports under `.vulnerability-reports/` only.
- Restrict `tools` to minimum; omit = inherit all tools.
- Set `model` on every agent: `haiku` cheap lookups, `sonnet` judgment, `opus` hard reasoning (code review, merge conflicts).
- Set `color` by role: green git/MR, cyan repo-fact analyzer, yellow scorer, purple reviewer/auditor, red security, orange Spec Kit, blue test, pink research.
- Subagents never get `AskUserQuestion`; missing info → return question to calling skill, skill asks user.
- Subagent spawns subagents only if `tools` has `Agent` (max 3 layers).
- Plugin agents ignore `hooks`, `mcpServers`, `permissionMode`, `initialPrompt`.
- Return concise results; parent sees only final message.
- Issue hit + fix → return a `Known issue: <symptom> → <fix>` line; parent skill decides whether to save it to auto memory. No `## Known issues` section.
- Build or update with `/cdk:build-agent`; field and tool details in `skills/build-agent/practices.md`.
- Verify: `plugin-dev:plugin-validator` agent + `claude plugin validate --strict .`.
- Docs: <https://code.claude.com/docs/en/sub-agents>
