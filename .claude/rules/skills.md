---
paths:
  - 'skills/**'
  - '.claude/skills/**'
  - 'agents/**'
---

# Skills and subagents

- Skills follow `skills/build-skill/references/rules.md`; subagents follow `skills/build-subagent/references/agent-checklist.md`.
- Each skill reads only its own files through `${CLAUDE_SKILL_DIR}`, never a `${CLAUDE_PLUGIN_ROOT}` path. It may invoke another skill, preferring a plain line ("run the <name> skill"); the Skill tool or `/plugin:name` is a fallback, never on a `Next:` line.
- A spawn describes the role in plain words first; naming the plugin subagent is allowed as a fallback beside it; an inline fallback is always required.
- A task skill takes `--yes` (unattended: no plan mode, no questions, recommended options, assumptions under `Open:`) and, with a plan mode, `--no-plan` (skips plan mode only; every question is still asked); only a flag the user passed counts. `--yes` never covers a destructive step (admin-bypass merge, force-push, branch delete, `git reset --hard`, overwriting a dirty or unnamed file).
- Exception: a project skill in `.claude/skills/` reads this repo's `skills/<name>/` files to follow their instructions and never invokes a skill, so a release runs the branch's skill text, not the installed plugin's. When it follows a skill with `--yes` behavior, its step 1 approval names the exact gated actions it pre-answers; anything unnamed is still asked.
- Verify: `claude plugin validate --strict .`, then `npm test`; a project skill also passes `node skills/build-skill/scripts/validate-skill.mjs .claude/skills/<name> --kind task`.
