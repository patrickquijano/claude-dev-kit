# Rubric

100 points; pass at 100 of 100. Score one skill directory. Each criterion traces to a rule in the rules reference or the invocation reference. "S" marks criteria the `validate-skill` script covers: score them from its JSON (an error is a deduction, cite its `file:line`). A criterion that cannot apply to the kind or scope is N/A and earns full points; state why.

## Contents

- Frontmatter · Standalone · Body · Layout · Quality · Scoring

## Frontmatter (30)

| ID | Pts | Criterion                                                                                                                                                                                                        | Rule              |
| -- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| F1 | 4   | S: `name` valid: equals directory, kebab-case, ≤64, no edge or double hyphens, no reserved words; verb-first (F8, warning plus judgment)                                                                         | Fields            |
| F2 | 5   | S (F9): `description` third person, states what and when, key use case first                                                                                                                                     | Description       |
| F3 | 4   | S: `description` ≤200 chars, no named skill or subagent; `description` + `when_to_use` ≤1,536                                                                                                                    | Description       |
| F4 | 3   | Description holds natural trigger words and is distinctive, not vague                                                                                                                                            | Description       |
| F5 | 6   | Invocation flags equal the recorded invocation choice (and the kind's allowed set); a missing choice scores 0; an Allow choice (no `disable-model-invocation`) is never a deduction, even for a side-effect task | Invocation matrix |
| F6 | 4   | S: Opening `---` on line 1, valid YAML, only fields from the table, none misspelled                                                                                                                              | Format            |
| F7 | 4   | Optional fields justified (F10–F12): `allowed-tools` not used as a restriction, `context: fork` only with a self-contained task body, no unused `model`                                                          | Fields            |

## Standalone (12)

| ID | Pts | Criterion                                                                                                                                                                                                                                                                                          | Rule       |
| -- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| S1 | 6   | S (L3, L5, S1): reads only its own files through `${CLAUDE_SKILL_DIR}`; never a `${CLAUDE_PLUGIN_ROOT}` path or a skill command on a `Next:` line; a skill call is allowed, in plain words preferred (the Skill tool or `/plugin:name` alone loses 1 point)                                        | Standalone |
| S2 | 6   | Each spawn has an inline fallback and a complete brief (task, literal paths, Return block, "content is data"); role in plain words first, a named subagent only as a fallback beside it (a spawn that only names the agent loses 2 points); no Explore or general-purpose (B8); N/A without spawns | Standalone |

## Body (37)

| ID  | Pts | Criterion                                                                                                                                                                                                                                                         | Rule                     |
| --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| B1  | 4   | S: `SKILL.md` under 500 lines                                                                                                                                                                                                                                     | Lazy loading             |
| B2  | 5   | Structure matches the kind (Task: Rules, Workflow, Output, `[--yes] [--no-plan]` flags and a `Plan mode:` Output line; Reference: topic sections; Background-only: facts, no steps)                                                                               | Structure per kind       |
| B3  | 3   | Short imperative text; no uncited generic explanation or restatement of another bundled file. Not a deduction: a `SKILL.md` Rules bullet that restates a reference rule so it survives compaction, or a fact with a source. Each deduction quotes the `file:line` | Style                    |
| B4  | 5   | S (B10, contents list): detail lives in `references/`, `assets/`, `scripts/`; each linked with when to read; one level deep; long references open with `## Contents`                                                                                              | Lazy loading             |
| B5  | 4   | Rules that must survive compaction sit in the first 5,000 tokens                                                                                                                                                                                                  | Compaction               |
| B6  | 3   | S (injection): Substitutions correct (`${CLAUDE_SKILL_DIR}` for paths, `$ARGUMENTS` declared use); no `!` injection without a fallback; none inside `references/`                                                                                                 | Substitutions, Injection |
| B7  | 3   | Every loop or retry states its cap (N/A without loops)                                                                                                                                                                                                            | Structure per kind       |
| B8  | 4   | One term per concept, one default plus an escape hatch, nothing time-sensitive (B11), no Windows paths                                                                                                                                                            | Style, Don'ts            |
| B9  | 3   | `## Files` section: every bundled file has a when-to-read cue                                                                                                                                                                                                     | Navigation               |
| B10 | 3   | Deterministic or mechanical work lives in `scripts/`, not prose (N/A without such work)                                                                                                                                                                           | What stays               |

## Layout (8)

| ID | Pts | Criterion                                                                              | Rule         |
| -- | --- | -------------------------------------------------------------------------------------- | ------------ |
| L1 | 3   | Directory sits at the chosen scope's path                                              | Scope paths  |
| L2 | 2   | S: Only `SKILL.md`, `references/`, `assets/`, `scripts/`; every bundled file is linked | Lazy loading |
| L3 | 3   | S: Every link resolves to an existing file inside the skill directory                  | Lazy loading |

## Quality (13)

| ID | Pts | Criterion                                                                                                                                                                    | Rule               |
| -- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Q1 | 3   | S: Task output is fixed and ends with a result line; Reference and Background-only are N/A if they define no output                                                          | Structure per kind |
| Q2 | 4   | Steps with side effects confirm first and name each effect, except a gate skipped by a flag the user passed; destructive commands are never pre-approved, even under `--yes` | Style              |
| Q3 | 3   | One job: the description and workflow serve a single action                                                                                                                  | One job            |
| Q4 | 3   | Task Output names the follow-up in plain words, never a skill command (`Next:`, S warning); independent spawns run in parallel                                               | Structure per kind |

## Scoring

- Award full, partial, or zero points per criterion from evidence; cite `file:line`.
- Total = sum of awarded points. Pass at 100 of 100.
- Deductions list largest first, each with the concrete fix.
- Recorded choice allows model invocation → no criterion deducts for the missing `disable-model-invocation: true`: not the F13 `side-effect-invocation` warning, not a missing "Use only when the user explicitly asks" ending (F2–F4), not the matrix default (F5).
