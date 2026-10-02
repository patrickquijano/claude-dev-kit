# Templates

Fill `{{...}}` from facts and answers. Apply each `<!-- -->` instruction, then strip it. Drop a section only when its rubric criterion is N/A. Drop command bullets with no repo command.

## CLAUDE.md

```markdown
# {{project name}}

{{one to two sentences: what this repo is and who uses it}}

## Architecture

<!-- Components, where they live, how they connect. No file-by-file listing. -->

- {{component}}: `{{path}}` — {{role, what it depends on}}

## Commands

<!-- Only commands found in the repo. Fenced or inline code, exact. -->

- Build: `{{command}}`
- Test: `{{command}}`
- Lint: `{{command}}`
- Format: `{{command}}`

## Precedence

<!-- Project policy from step 3 answer, not Claude Code load order. -->

- Order: {{precedence order; recommended: explicit user request > path-scoped rule > this file > unconditional rules > skill defaults}}.
- Conflict between two instructions → {{conflict policy}}.
- Design trade-offs: {{order; default from `principles.md` `## Trade-off order`}}. <!-- Drop when principles omitted. -->

## Boundaries

<!-- One line per rubric B1 class present in repo. -->

- Never: {{destructive op, secret handling, hook bypass}}.
- Ask first: {{push, publish, history rewrite, protected branch}}.

## Changes

- Change only what the task needs; no unrelated edits or refactors.
- One logical change per commit.

## Definition of done

<!-- Every item is an exact command or check. -->

- [ ] `{{format command}}` passes.
- [ ] `{{lint command}}` passes.
- [ ] `{{test or validate command}}` passes.

## Maintenance

- Update this file and `.claude/rules/` in the same change that alters a command, path, or convention.
- Record each resolved issue under Known issues as `- <symptom> → <fix>`; check the list before debugging.

## Known issues

- none
```

## Principles rule — `.claude/rules/principles.md`

Unconditional (no frontmatter). Fill from `principles.md` `## Catalog`, `## Avoid`, and `## Default requirements`, plus facts `Patterns`, keeping only items the repo has a place for.

```markdown
# Principles

<!-- Group lines; each is a repo-specific action naming repo tools, paths, or commands from facts. ≤30 non-blank lines. Drop a line the repo has no place for. -->

- Guidance, not law: preserve existing architecture and conventions; prefer keeping working code over rewriting it only to satisfy a principle.
- Simplicity: {{repo action: simplest working solution; no speculative abstractions; extract on third repeat; one source of truth per business rule; optimize only after <repo perf command or profiler> shows need}}.
- Structure: {{repo action: one responsibility per <repo layer>; small interfaces only where two implementations or a test double exist; keep internals private; compose over deep inheritance; talk to direct collaborators only}}.
- Behavior: {{repo action: follow existing naming; explicit dependencies; commands change state, queries return data; check preconditions and fail fast; immutable or stateless where cheap; safe retries; compatible public APIs}}.
- Security: {{repo action: safe defaults; minimum permissions; errors expose no internals; dependency scan via <repo scanner>; layered checks}}.
- Validation: validate and encode untrusted input at trust boundaries. <!-- Validator and boundary path go in the path-scoped rule. -->
- Reliability: {{timeouts on remote calls; degrade optional dependencies — only where the repo calls remote services}}.
- Testing: {{new behavior gets a test via the `CLAUDE.md` Commands test command; assert behavior, not internals}}.
- Errors and observability: {{no swallowed errors; errors carry context; <repo logger> with levels; no secrets or personal data in logs}}.
- Maintainability: {{readable names, comments only for why; tidy only lines the change already edits; record larger cleanups in <issue tracker>; automate a manual step on its third repeat with <repo task runner>}}.
- Operations: {{config via env, migrations with rollback, health checks — only where the repo deploys or runs services}}.
- Patterns in use: {{pattern — path, one sub-bullet each from facts `Patterns`; drop when none}}.
- New patterns: only for a problem the code shows now; name the problem in the PR or MR description or a code comment.
- Avoid: {{`principles.md` `## Avoid` items}}.
- Deviations: {{constraint — accepted deviation, one line each; drop when none}}.
- Verify: {{review the diff against this file before commit; then Definition of done}}.
```

## Rule file — `.claude/rules/<topic>.md`

Unconditional rule → omit the frontmatter block. Language, framework, directory, or domain guidance → `paths` globs from facts `Stack`.

```markdown
---
paths:
  - '{{glob}}'
---

# {{Topic}}

- {{specific, verifiable instruction}}
- Verify: `{{command}}`
```
