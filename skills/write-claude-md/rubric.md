# CLAUDE.md Rubric

Total 100. Pass ≥95. Scope: project `CLAUDE.md` (or `.claude/CLAUDE.md`), its `@imports`, and `.claude/rules/**/*.md`.

## Scoring

Type: `bin` = full or 0; `ratio` = max × (passing units ÷ total units), floor to whole points.
Instruction line = list item or sentence telling Claude what to do or not do. Always-loaded = `CLAUDE.md` + its `@imports` + rules without `paths`.

| ID  | Category    | Criterion                                                                                                                                                                                                                                                                              | Type  | Max |
| --- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --- |
| Z1  | Size        | Always-loaded lines total <200 (count non-blank lines).                                                                                                                                                                                                                                | bin   | 8   |
| Z2  | Size        | Unit = rule file for one component or file type; has `paths` frontmatter and each glob matches ≥1 tracked file.                                                                                                                                                                        | ratio | 4   |
| Z3  | Size        | Unit = instruction line; not duplicated in another file (same meaning, not only same words).                                                                                                                                                                                           | ratio | 3   |
| V1  | Value       | Unit = instruction line; not derivable from code, not a standard language convention, not a file-by-file listing, not volatile (dates, counts).                                                                                                                                        | ratio | 8   |
| V2  | Value       | Architecture section: components, where they live, how they connect (flow or ownership). No syntax tutorials.                                                                                                                                                                          | bin   | 7   |
| S1  | Specificity | Unit = instruction line; verifiable: concrete value, exact command, path, or checkable condition ("2-space indent", not "format well"). Lines required by P1, F1, M1 exempt.                                                                                                           | ratio | 10  |
| S2  | Specificity | Emphasis words (`MUST`, `NEVER`, `IMPORTANT`, `CRITICAL`, all-caps) on ≤25% of instruction lines.                                                                                                                                                                                      | bin   | 5   |
| A1  | Accuracy    | Unit = command shown; exists (package script, Makefile target, bin, CI job, facts `Commands`, installed tool).                                                                                                                                                                         | ratio | 6   |
| A2  | Accuracy    | Unit = repo path or file referenced; exists.                                                                                                                                                                                                                                           | ratio | 4   |
| A3  | Accuracy    | Unit = rule domain: each rule file + each CLAUDE.md section stating checkable conventions (style, testing, etc.); states exact verification command or check. Exempt sections: Architecture, Commands, Precedence, Boundaries, Changes, Definition of done, Maintenance, Known issues. | ratio | 5   |
| P1  | Precedence  | States precedence order (e.g. user request > path rule > CLAUDE.md > skill) and what to do on conflict (ask, or named winner).                                                                                                                                                         | bin   | 5   |
| P2  | Precedence  | No contradiction between files, including `CLAUDE.local.md` and ancestor files the analyzer reports. Contradiction with an unwritable file passes when project file names the winner.                                                                                                  | bin   | 5   |
| B1  | Boundaries  | Unit = boundary class: destructive ops, secrets/credentials, protected branches or history rewrite, hook/check bypass, outward actions (push, publish, post). Each has a never or ask-first rule.                                                                                      | ratio | 10  |
| F1  | Focus       | Focused-change rule: change only what task needs, one logical change per commit, no unrelated edits or refactors.                                                                                                                                                                      | bin   | 5   |
| D1  | Done        | Definition of done: objective checklist of exact commands or checks that must pass before claiming completion.                                                                                                                                                                         | bin   | 10  |
| M1  | Maintenance | Maintenance rule: when to update memory files and the log format for resolved issues (e.g. `- <symptom> → <fix>`).                                                                                                                                                                     | bin   | 5   |

Category totals: Size 15, Value 15, Specificity 15, Accuracy 15, Precedence 10, Boundaries 10, Focus 5, Done 10, Maintenance 5 = 100.

## N/A rules

N/A → full points; evidence states rule. Use only these rules.

- Ratio with zero units → N/A.
- B1: boundary class wholly impossible in repo → drop that unit. Partly impossible (e.g. no git remote) → rule need only cover possible actions.
- Item in prompt `Omitted:` list → criterion needing it N/A: architecture → V2; precedence → P1; boundaries → B1; focused changes → F1; done → D1; maintenance → M1.

## Placement rules

- Always-loaded `CLAUDE.md`: overview, architecture, commands, precedence, boundaries, focused changes, definition of done, maintenance, known issues.
- Unconditional rule (no `paths`): cross-cutting policy too long for `CLAUDE.md` (e.g. principles, git). Counts toward Z1.
- Path-scoped rule (`paths` globs): guidance for one component or file type. Loads only when Claude reads matching files.
- `@import`: use only to reuse an existing doc; it still loads into context.
- Hard requirement Claude must never break → also suggest a hook; memory files are advisory.
- Never write `CLAUDE.local.md`, `~/.claude/**`, or managed policy files.

## Sources

- <https://code.claude.com/docs/en/memory>
- <https://code.claude.com/docs/en/best-practices>
- <https://code.claude.com/docs/en/hooks-guide>
