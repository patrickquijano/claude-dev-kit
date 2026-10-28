---
paths:
  - 'skills/**'
  - '.claude/skills/**'
  - 'agents/**'
---

# Skills and subagents

- Skills follow `skills/build-skill/references/rules.md`; subagents follow `skills/build-subagent/references/agent-checklist.md`.
- Each skill is standalone: it reads only its own files through `${CLAUDE_SKILL_DIR}`, never names or invokes another skill or uses `${CLAUDE_PLUGIN_ROOT}`; a spawn describes the role in plain words, never names an agent, and has an inline fallback.
- Exception: a project skill in `.claude/skills/` may read this repo's `skills/<name>/` files to follow their instructions; it still never invokes a skill.
- One agent, one job.
- Verify: `claude plugin validate --strict .`, then `npm test`; a project skill also passes `node skills/build-skill/scripts/validate-skill.mjs .claude/skills/<name> --kind task`.
