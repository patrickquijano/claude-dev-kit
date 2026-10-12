# Known issues

Shared by every `cdk:` skill. The linking skill passes `<skill>` (its slug) and `<store>` (its `${CLAUDE_PLUGIN_DATA}/known-issues`, already resolved).

- Before fixing an issue, read `<store>/<skill>.md` if it exists; reuse a matching fix.
- Recurring or workflow-blocking issue fixed (incl. subagent `Known issue:` lines) → append `- <symptom> → <fix>` to `<store>/<skill>.md`. Create the directory and file if missing; skip a duplicate.
- Issue belongs to the project, not the skill → save it to auto memory instead (type `feedback`, body `<symptom> → <fix>`, plus a `MEMORY.md` pointer).
- Never record a known issue in the repo (no `SKILL.md`, agent, `CLAUDE.md`, or rules file).
- `<store>` still contains `${` (non-plugin run) or a write is denied → print `<symptom> → <fix>` for the user.
