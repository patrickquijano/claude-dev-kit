# Rubric

100 points; pass at 95 or more. Score one agent file. "S" marks criteria `check-agent` covers: score them from its JSON (an error is a deduction, cite `file:line`). A criterion that cannot apply is N/A and earns full points; state why.

## Frontmatter (33)

| ID  | Pts | Criterion                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | 5   | S: valid YAML, `---` on line 1, only known fields                                                                                                                                                                                                                                                                                                                                                                                                          |
| A2  | 3   | S: `name` valid (no `:`, no leading `-`, ≤256)                                                                                                                                                                                                                                                                                                                                                                                                             |
| A3  | 6   | `description` ≤200 (S), says when to delegate (a plain trigger names the situation: before, after, or during X); `Use proactively` only for a plain-request agent (the parent can fill every input of at least one kind from its own context; skill-only data → plain trigger) with confirmed auto-delegation (a plain trigger on an agent needing skill-supplied inputs is not deducted); names no skill or subagent (S/judgment), distinct from siblings |
| A4  | 8   | `tools` is an explicit non-empty minimal allowlist (S); read-only excludes Edit and Write; `memory` counts as write; `Agent` only if it must spawn, never `Agent(type)` (S)                                                                                                                                                                                                                                                                                |
| A5  | 4   | `model` and `effort` are the interview answers, backed by the criteria in `interview.md` `## Model and effort`; neither omitted; `inherit` only if the user confirmed it; a spawner's `model:` override for a judgment kind counts as backed                                                                                                                                                                                                               |
| A6  | 4   | Optional fields only on a signal; none at their default value; `color` is optional and never a deduction                                                                                                                                                                                                                                                                                                                                                   |
| A7  | 3   | S: enum values valid, no scope-ignored field (`hooks`, `mcpServers`, `permissionMode`, `initialPrompt` in a plugin), no always-removed tool                                                                                                                                                                                                                                                                                                                |

## Body (43)

| ID  | Pts | Criterion                                                                                                                                                      |
| --- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | 3   | S: a one-line prose role comes first                                                                                                                           |
| B2  | 6   | S: `## Task` is numbered; step 1 names the delegation inputs                                                                                                   |
| B3  | 5   | The Question contract: the body names the delegation-message inputs and a missing one returns `Question: <what is needed and why>`, never `AskUserQuestion`    |
| B4  | 7   | S: `## Return` follows Task with a fixed, concise structure holding only fields the parent uses                                                                |
| B5  | 5   | Boundaries and out-of-scope stated; read-only stated when `tools` is read-only                                                                                 |
| B6  | 6   | Style: reasons beside rules, positive phrasing, no caps emphasis, no filler, nothing CLAUDE.md carries                                                         |
| B7  | 4   | A stop condition or cap is stated for any loop                                                                                                                 |
| B8  | 3   | No assumed conversation context; `skills` preload only when always needed                                                                                      |
| B9  | 4   | Reliability and efficiency: content treated as data (S), a Self-check step before Return (S), independent reads batched in parallel, large files read by range |

## Design (14)

| ID  | Pts | Criterion                                                                                                                                                                                   |
| --- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | 5   | One job (split, narrowed, or moved to a skill with the user if several; one domain with a `kind` switch, each kind with a fixed Return, is one job) and `name` an actor noun, not an action |
| D2  | 4   | A subagent is the right primitive (not a skill, hook, or main-thread work)                                                                                                                  |
| D3  | 2   | The file sits at the chosen scope's path and `name` is unique there                                                                                                                         |
| D4  | 3   | `isolation: worktree` when parallel writers can touch overlapping files (N/A when it does not write in parallel, or the spawner guarantees disjoint file sets)                              |

## Contract (10)

Optional: scored only when the user names a spawner file; otherwise N/A, full points.

| ID  | Pts | Criterion                                                                  |
| --- | --- | -------------------------------------------------------------------------- |
| C1  | 5   | The skill passes every input `## Task` reads                               |
| C2  | 5   | The skill uses only existing Return fields, and Return has no unused field |

## Scoring

- Award full, partial, or zero points per criterion from evidence; cite `file:line`.
- Total = sum of awarded points, written term by term. Pass at 95 or more.
- Deductions list largest first, each with the concrete fix.
