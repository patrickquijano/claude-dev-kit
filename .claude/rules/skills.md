---
paths:
  - 'skills/**'
  - 'agents/**'
---

# Skills and subagents

- Skills follow `skills/build-skill/references/rules.md`; subagents follow `skills/build-subagent/references/agent-checklist.md`.
- Each skill is standalone: it reads only its own files through `${CLAUDE_SKILL_DIR}`, never names or invokes another skill or uses `${CLAUDE_PLUGIN_ROOT}`; a spawn describes the role in plain words, never names an agent, and has an inline fallback.
- One agent, one job.
- Verify: `claude plugin validate --strict .`, then `npm test`.
