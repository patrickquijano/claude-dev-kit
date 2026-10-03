---
paths:
  - 'skills/**'
---

# Skills

- One skill per `skills/<name>/SKILL.md`; `name` = directory, kebab-case.
- `description` = trigger: what it does + when to use, key use case first. Description + `when_to_use` max 1,536 chars.
- `SKILL.md` under 500 lines. Reference material → sibling files, link them (progressive disclosure).
- Never set `disable-model-invocation`, never ask about it or offer it as an option; side-effect skills gate on description (`Use only when the user explicitly asks ...`). Only exception: user explicitly asks to disable model invocation for that skill. Skills chained by other skills via the Skill tool never set it (blocks the chain).
- Pre-approve only needed tools via `allowed-tools`. Never pre-approve `git push`, MR create/update, or comment, approve, resolve, merge endpoints; permission prompt = second guard.
- Frontmatter order: `name`, `description`, `argument-hint`, `allowed-tools`, `disable-model-invocation`.
- Body: `Input: $ARGUMENTS` (omit when no input), `## Rules`, `## Workflow` (numbered steps, bold labels `**Pre-flight.**`), `## Output` (fenced `text`, ends `Result: done | nothing-to-do | stopped | cancelled` + `Stopped: <step>: <reason> | none`).
- Every loop and retry states its cap in Rules. Side-effect confirmation options name each effect ("Commit + push").
- Shared rules: third occurrence → sibling file, linked `${CLAUDE_SKILL_DIR}/../<skill>/<file>` (e.g. `commit-changes/conventions.md`).
- Use `$ARGUMENTS` / `${CLAUDE_SKILL_DIR}` substitutions, not hard-coded paths.
- Known issues live in Claude auto memory (`feedback` memory + `MEMORY.md` pointer), never in `SKILL.md`; no `## Known issues` section. Each Rules section links `build-skill/known-issues.md` with its slug.
- Shared files: `build-skill/known-issues.md`, `build-skill/fallbacks.md` (no AskUserQuestion/Write), `build-agent/practices.md` (subagent drafting), `ship-merge-request/orchestration.md` (skills chaining `cdk:` skills), `commit-changes/conventions.md` (git), `submit-merge-request/gitlab.md` (glab pre-flight, MR reads), `setup-spec-kit/speckit-chain.md`, `setup-husky/package-manager.md`, `setup-test-hook/stacks.md` (runner detection), `write-unit-tests/conventions.md` (test-writing skills). Link them; never copy their rules.
- Verify: `plugin-dev:skill-reviewer` + `cdk:skill-auditor` agents + `claude plugin validate --strict .`; never run LLM-graded `claude plugin eval`.
- Docs: <https://code.claude.com/docs/en/skills>
