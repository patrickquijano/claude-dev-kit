# Rubric

100 points; pass at 95 or more. Score one skill directory. Each criterion traces to a rule in `frontmatter.md` (F) or `body.md` (B). "S" marks criteria the `check-skill` script covers: score them from its JSON (an error is a deduction, cite its `file:line`). A criterion that cannot apply to the kind or scope is N/A and earns full points; state why.

## Contents

- Frontmatter · Body · Layout · Quality · Scoring

## Frontmatter (35)

| ID  | Pts | Criterion                                                                                                                                                 | Rule                |
| --- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| F1  | 4   | S: `name` valid: equals directory, kebab-case, ≤64, no edge or double hyphens, no reserved words                                                          | F Fields            |
| F2  | 6   | `description` third person, states what and when, key use case first                                                                                      | F Description       |
| F3  | 4   | S: `description` + `when_to_use` ≤1,536 chars (≤1,024 for `description`)                                                                                  | F Description       |
| F4  | 4   | Description holds natural trigger words and is distinctive, not vague                                                                                     | F Description       |
| F5  | 6   | Invocation flags match the chosen kind per the invocation matrix                                                                                          | F Invocation matrix |
| F6  | 4   | S: Opening `---` on line 1, valid YAML, only fields from the table, none misspelled                                                                       | F Format            |
| F7  | 4   | Optional fields justified: `allowed-tools` not used as a restriction, `context: fork` only with a self-contained task body, no unused `model` or `effort` | F Fields            |
| F8  | 3   | `name` is an action (verb-first), not an actor; S (warning) plus judgment                                                                                 | F Fields            |

## Body (45)

| ID  | Pts | Criterion                                                                                                                                                              | Rule                       |
| --- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| B1  | 4   | S: `SKILL.md` under 500 lines                                                                                                                                          | B Lazy loading             |
| B2  | 6   | Structure matches the kind (Task: Rules, Workflow, Output; Reference: topic sections; Background-only: facts, no steps)                                                | B Structure per kind       |
| B3  | 4   | Short imperative text; nothing Claude already knows                                                                                                                    | B Style                    |
| B4  | 7   | S (contents list): Detail lives in `references/`, `assets/`, `scripts/`; each linked with when to read; one level deep; long references open with a contents list      | B Lazy loading             |
| B5  | 4   | Rules that must survive compaction sit in the first 5,000 tokens                                                                                                       | B Compaction               |
| B6  | 4   | S (injection): Substitutions correct (`${CLAUDE_SKILL_DIR}` for paths, `$ARGUMENTS` declared use); every `!` injection ends with a fallback; none inside `references/` | B Substitutions, Injection |
| B7  | 4   | Every loop or retry states its cap (N/A without loops)                                                                                                                 | B Structure per kind       |
| B8  | 5   | One term per concept, one default plus an escape hatch, no time-sensitive facts, no Windows paths                                                                      | B Style, Don'ts            |
| B9  | 4   | Navigation section: every bundled file has a when-to-read cue (script checks the section exists)                                                                       | B Navigation               |
| B10 | 3   | Deterministic or mechanical work lives in `scripts/`, not prose (N/A without such work)                                                                                | B What stays               |

## Layout (8)

| ID  | Pts | Criterion                                                                              | Rule                   |
| --- | --- | -------------------------------------------------------------------------------------- | ---------------------- |
| L1  | 3   | Directory sits at the chosen scope's path                                              | decide.md Scope        |
| L2  | 2   | S: Only `SKILL.md`, `references/`, `assets/`, `scripts/`; every bundled file is linked | B Lazy loading, Don'ts |
| L3  | 3   | S: Every link resolves to an existing file                                             | B Lazy loading         |

## Quality (12)

| ID  | Pts | Criterion                                                                                                                | Rule                 |
| --- | --- | ------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| Q1  | 4   | S: Task output is fixed and ends with a result line; Reference and Background-only are N/A only if they define no output | B Structure per kind |
| Q2  | 4   | Steps with side effects confirm first and name each effect; destructive commands are never pre-approved                  | B Style              |
| Q3  | 4   | One job: the description and workflow serve a single action                                                              | decide.md One job    |

## Scoring

- Award full, partial, or zero points per criterion from evidence; cite `file:line`.
- Total = sum of awarded points. Pass at 95 or more.
- Deductions list largest first, each with the concrete fix.
