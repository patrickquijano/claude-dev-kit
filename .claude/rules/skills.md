---
paths:
  - 'skills/**'
---

# Skills

- One skill per `skills/<name>/SKILL.md`; `name` = directory, kebab-case.
- `description` = trigger: what it does + when to use, key use case first. Description + `when_to_use` max 1,536 chars.
- `SKILL.md` under 500 lines. Reference material → sibling files, link them (progressive disclosure).
- Never set `disable-model-invocation`, never ask about it or offer it as an option; side-effect skills gate on description (`Use only when the user explicitly asks ...`). Only exception: user explicitly asks to disable model invocation for that skill. Skills chained by other skills via the Skill tool never set it (blocks the chain).
- Skills that chain skills, and the skills they chain, never set `context: fork`; chain via the Skill tool in the main thread, never the Agent tool, so no subagent nests another (`ship-changes/orchestration.md`).
- Pre-approve only needed tools via `allowed-tools`. Never pre-approve `git push`, MR create/update, or comment, approve, resolve, merge endpoints; permission prompt = second guard. Never pre-approve a `glab api` or `gh api` pattern ending in `*`: flags appended after it (`-X PUT`, `-f`) turn the read into a write.
- Frontmatter order: `name`, `description`, `argument-hint`, `allowed-tools`, `disable-model-invocation`.
- Body: `Input: $ARGUMENTS` (omit when no input), `## Rules`, `## Workflow` (numbered steps, bold labels `**Pre-flight.**`), `## Output` (fenced `text`, ends `Result: done | nothing-to-do | stopped | cancelled` + `Stopped: <step>: <reason> | none`).
- Every loop and retry states its cap in Rules. Side-effect confirmation options name each effect ("Commit + push").
- Skills whose Output reports findings (failed or skipped checks, gaps, suspected bugs, blockers, open items) have a `**Resolve findings.**` workflow step, last before any `**Report**` step, that links `build-skill/resolve-findings.md` (`scope: edit | ask-only`, `sources`), and add `Resolution:` (never `Findings:`, which review skills use for their own tally) before `Result:` in Output. A skill with its own equivalent capped fix-and-ask loop (`run-spec-kit`, `scan-vulnerabilities`, `fix-spec-kit-bug`, `assess-spec-kit-idea`, `address-*-review`, `write-readme`, `write-claude-md`, `write-changelog`, `write-prompt`, `write-dockerfile`, `write-github-workflows`, `build-skill`, `build-agent`) keeps it and omits the step; never duplicate the procedure inline. Skills with no findings (`commit-changes`, `switch-branch`) omit it.
- Shared rules: third occurrence → sibling file, linked `${CLAUDE_SKILL_DIR}/../<skill>/<file>` (e.g. `commit-changes/conventions.md`).
- Use `$ARGUMENTS` / `${CLAUDE_SKILL_DIR}` substitutions, not hard-coded paths.
- Known issues live in Claude auto memory (`feedback` memory + `MEMORY.md` pointer), never in `SKILL.md`; no `## Known issues` section. Each Rules section links `build-skill/known-issues.md` with its slug.
- Shared files: `build-skill/known-issues.md`, `build-skill/fallbacks.md` (no AskUserQuestion/Write), `build-skill/resolve-findings.md` (final findings step), `build-agent/practices.md` (subagent drafting), `ship-changes/orchestration.md` (skills chaining `cdk:` skills), `commit-changes/conventions.md` (git), `prepare-merge-request/gitlab.md` (glab pre-flight, MR reads), `prepare-pull-request/github.md` (gh pre-flight, PR identity, managed section; also used by `address-pull-request-review`), `prepare-pull-request/findings.md` (PR reviewer output contract and `## Direct review` for small changes, shared with `review-pull-request`), `address-pull-request-review/state.md` + `github-feedback.md` (PR feedback items, state, GitHub mutations), `address-merge-request-review/replies.md` (reply templates, also used by `address-pull-request-review`), `setup-spec-kit/speckit-chain.md`, `setup-husky/package-manager.md`, `setup-husky/ignores.md` (linter, formatter, Docker ignore syntax), `setup-test-hook/stacks.md` (runner detection), `write-unit-tests/conventions.md` (test-writing skills), `write-dockerfile/practices.md` (base image tag resolution, also followed by `write-github-workflows/versions.md` for container and service images). Link them; never copy their rules.
- Verify: `plugin-dev:skill-reviewer` + `cdk:skill-auditor` agents + `claude plugin validate --strict .`; never run LLM-graded `claude plugin eval`.
- Docs: <https://code.claude.com/docs/en/skills>
