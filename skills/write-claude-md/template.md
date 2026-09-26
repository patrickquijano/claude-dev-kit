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

## Rule file — `.claude/rules/<topic>.md`

Unconditional rule → omit the frontmatter block.

```markdown
---
paths:
  - '{{glob}}'
---

# {{Topic}}

- {{specific, verifiable instruction}}
- Verify: `{{command}}`
```
