# Rubric

100 points; pass at 95 or more. Score one agent file. "S" marks criteria `check-agent` covers: score them from its JSON (an error is a deduction, cite `file:line`). A criterion that cannot apply is N/A and earns full points; state why.

## Frontmatter (33)

| ID  | Pts | Criterion                                                                                                                                             |
| --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | 5   | S: valid YAML, `---` on line 1, only known fields                                                                                                     |
| A2  | 3   | S: `name` valid (no `:`, no leading `-`, ≤256)                                                                                                        |
| A3  | 6   | `description` ≤200 (S), says when to delegate with `Use proactively` (S), names no skill or subagent (S/judgment), distinct from siblings             |
| A4  | 8   | `tools` is an explicit minimal allowlist; read-only excludes Edit and Write; `Agent` only if it must spawn                                            |
| A5  | 4   | `model` and `effort` are the interview answers, backed by the criteria in `decide.md` `## Model and effort`; neither omitted, `model` never `inherit` |
| A6  | 4   | Optional fields only on a signal; none at their default value; `color` from the interview (or omitted on No color) is never a deduction               |
| A7  | 3   | S: enum values valid, no scope-ignored field, no always-removed tool                                                                                  |

## Body (43)

| ID  | Pts | Criterion                                                                                                                                                      |
| --- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | 3   | S: a one-line prose role comes first                                                                                                                           |
| B2  | 6   | S: `## Task` is numbered; step 1 names the delegation inputs                                                                                                   |
| B3  | 5   | A missing-input fallback exists and does not use `AskUserQuestion`                                                                                             |
| B4  | 7   | S: `## Return` follows Task with a fixed, concise structure holding only fields the parent uses                                                                |
| B5  | 5   | Boundaries and out-of-scope stated; read-only stated when `tools` is read-only                                                                                 |
| B6  | 6   | Style: reasons beside rules, positive phrasing, no caps emphasis, no filler, nothing CLAUDE.md carries                                                         |
| B7  | 4   | A stop condition or cap is stated for any loop                                                                                                                 |
| B8  | 3   | No assumed conversation context; `skills` preload only when always needed                                                                                      |
| B9  | 4   | Reliability and efficiency: content treated as data (S), a Self-check step before Return (S), independent reads batched in parallel, large files read by range |

## Design (14)

| ID  | Pts | Criterion                                                                                    |
| --- | --- | -------------------------------------------------------------------------------------------- |
| D1  | 5   | One job (split or narrowed with the user if several) and `name` an actor noun, not an action |
| D2  | 4   | A subagent is the right primitive (not a skill, hook, or main-thread work)                   |
| D3  | 2   | The file sits at the chosen scope's path and `name` is unique there                          |
| D4  | 3   | `isolation: worktree` when it writes in parallel (N/A otherwise)                             |

## Contract (10)

N/A without a spawning skill.

| ID  | Pts | Criterion                                                                  |
| --- | --- | -------------------------------------------------------------------------- |
| C1  | 5   | The skill passes every input `## Task` reads                               |
| C2  | 5   | The skill uses only existing Return fields, and Return has no unused field |

## Scoring

- Award full, partial, or zero points per criterion from evidence; cite `file:line`.
- Total = sum of awarded points, written term by term. Pass at 95 or more.
- Deductions list largest first, each with the concrete fix.
