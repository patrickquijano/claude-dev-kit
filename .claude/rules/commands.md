---
paths:
  - 'commands/**'
---

# Commands

- One flat file per command: `commands/<name>.md`, kebab-case; invoked as `/cdk:<name>`.
- Frontmatter order: `description`, `argument-hint`, `allowed-tools`. `description` states what it does and gates with `Use only when the user explicitly asks ...`; never set `disable-model-invocation`.
- Body: `Input: $ARGUMENTS` (omit when no input), `## Rules`, `## Workflow` (numbered steps, bold labels), `## Output` (fenced `text`, ends `Result: done | nothing-to-do | stopped | cancelled` + `Stopped: <step>: <reason> | none`).
- Link shared files with `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/<file>`; never copy their rules.
- `allowed-tools` limits match skills (`.claude/rules/skills.md`): read-only commands only; never pre-approve push, merge, delete, or a `gh api` pattern ending in `*`.
- Every loop and retry states its cap in Rules.
- Verify: `claude plugin validate --strict .` and `cdk:skill-auditor` on the file.
