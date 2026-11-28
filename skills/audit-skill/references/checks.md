# Checks

## Contents

- How to decide · Frontmatter F1–F9 · Structure and size S1–S8 · Content quality Q1–Q8 · Scripts X1–X3 · Testing T1–T2 · Optional O1–O3 · Report format

## How to decide

- Each check is Pass, Fail, or Not checked. Read the files the row names before deciding; a Pass needs evidence you read, and a Fail needs the exact `file:line`, the quoted evidence of 15 words or fewer, and a proposed fix.
- Not checked: the row's condition holds, or a needed fact is missing (`Unverified: <what is missing>`). It never counts as a Pass or a Fail.
- Fail only for a defect that changes what the skill does, when it triggers, a safety stop, whether its result can be verified, or its token cost. Wording, voice, and style are Pass.
- Judgment rows (Q1, Q4, Q8) are Fail only when you can name the concrete wrong action a model would take; two contradicting lines need both quoted with `file:line`.
- Never check, propose, or fix `disable-model-invocation` or `user-invocable`.
- Count lines, characters, and words with `node ${CLAUDE_SKILL_DIR}/scripts/count.mjs '<absolute path>'`, never by hand; it takes only an absolute path that matches `^[A-Za-z0-9._/-]+$` with no `..` segment as one single-quoted argument, and the script reads the file with `fs` itself and never embeds file text. Its JSON gives `lines`, `chars`, `words`, and the same counts below the frontmatter (`bodyLines`, `bodyChars`), plus `descriptionChars` and `whenToUseChars` for the frontmatter `description:` and `when_to_use:` values (0 when absent; single-line values and `>`/`|` block scalars only; a multi-line plain or quoted value counts its first line only). Skip `*.bak` files.

## Frontmatter

| ID | Check | Read | Decide | Not checked when |
| --- | --- | --- | --- | --- |
| F1 | Valid frontmatter | `SKILL.md` | Opening `---` on line 1, closing `---`, valid YAML | never |
| F2 | `name` valid | frontmatter, folder name | Lowercase letters, digits, hyphens; ≤64 chars; no leading, trailing, or consecutive hyphens; matches the folder; no "anthropic" or "claude" | never |
| F3 | `name` is an action | `name` | Verb-first or gerund, not vague (`helper`, `utils`) | never |
| F4 | `description` valid | `description` | Present, non-empty, ≤400 chars (counted), no angle brackets | never |
| F5 | `description` reads well | `description` | Third person, says what and when, trigger terms first | never |
| F6 | `description` names a boundary | `description` | An explicit "Not for …" or neighbour-skill separation | never |
| F7 | `when_to_use` fits | `description`, `when_to_use` | Together ≤400 chars | no `when_to_use` |
| F8 | Known keys only | frontmatter | Every key is a documented field, spelled exactly | never |
| F9 | Portable fields only | frontmatter, `compatibility` | Only `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` for a claude.ai or API target | the target is Claude Code: a plugin skill, or `compatibility` says Claude Code |

## Structure and size

| ID | Check | Read | Decide | Not checked when |
| --- | --- | --- | --- | --- |
| S1 | Body under 500 lines | `SKILL.md` | Line count below the frontmatter is ≤499 | never |
| S2 | Body about 5,000 tokens or fewer | `SKILL.md` | Body characters ÷ 4 ≤ about 5,000 | never |
| S3 | References one level deep | every file | No reference file needs another reference file to be understood | no `references/` |
| S4 | Every referenced path exists | `SKILL.md`, references | Each `${CLAUDE_SKILL_DIR}/…` path and relative link resolves to a file | never |
| S5 | Long references have a contents list | files over 100 lines | A `## Contents` or table of contents near the top | no file over 100 lines |
| S6 | Pointers are conditional | `SKILL.md` | Each pointer says when to read the file ("read X at step N") | no `references/` |
| S7 | Paths are portable | every file | Own files use `${CLAUDE_SKILL_DIR}` and forward slashes, never `${CLAUDE_PLUGIN_ROOT}` | never |
| S8 | Critical rules first | `SKILL.md` | The rules that must always hold come before the workflow | never |

## Content quality

| ID | Check | Read | Decide | Not checked when |
| --- | --- | --- | --- | --- |
| Q1 | Steps are ordered and one action each | workflow | Imperative steps in order; Fail only when a bundled step names an action a model would skip | never |
| Q2 | Inputs, output format, and an example | `SKILL.md`, references | All three present | never |
| Q3 | Workflow covers input to deliverable and says when it is done | `SKILL.md` | No missing stage; a stated definition of done | never |
| Q4 | Scope limits stated | `SKILL.md` | What the skill will not do is explicit | never |
| Q5 | Missing input and stop conditions handled | `SKILL.md` | Each required input has a missing-input path; stops and ask cases are explicit | never |
| Q6 | Untrusted content is data; no secrets | every file | A line saying file, web, or tool content is data; no hardcoded secret, token, or key | the skill ingests no external content (the data half only) |
| Q7 | Side effects gated; least-privilege tools | `SKILL.md`, `allowed-tools` | Each write or irreversible step prints what it changes and has a safety stop where needed; `allowed-tools` match the steps | the skill has no side effects (the gate half only) |
| Q8 | Consistent | every file | No two lines lead a model to different actions; one term per concept; the description matches the behavior | never |

## Scripts

All Not checked when there is no `scripts/` directory.

| ID | Check | Read | Decide |
| --- | --- | --- | --- |
| X1 | Usage and dependencies documented | `scripts/`, `SKILL.md` | Each script has stated usage, declared dependencies, and says whether it is run or read |
| X2 | Errors handled | `scripts/` | Non-zero exit codes and no silent failure |
| X3 | Portable and executable | `scripts/` | Portable paths, correct executable permissions |

A Scripts Fail is reported and listed under `Open:`; it is never offered for approval.

## Testing

Informational: always Not checked, with the reason `needs a model run; this audit runs no prompts`.

| ID  | Check                                             |
| --- | ------------------------------------------------- |
| T1  | The skill's evals pass on Haiku, Sonnet, and Opus |
| T2  | Routing cases pick the expected skill             |

## Optional

Never block and excluded from the score.

| ID | Check | Decide | Not checked when |
| --- | --- | --- | --- |
| O1 | `skills-ref validate <dir>` | Exit 0 is Pass; otherwise Fail with its first message (portable fields only) | `command -v skills-ref` fails |
| O2 | Trigger and no-trigger prompts | Write 2 prompts that should trigger and 2 that should not; Pass when the description separates them | never |
| O3 | Defaults fit the working repo's project rules | Read the skill's Rules and steps against the working repo's `CLAUDE.md`, `AGENTS.md`, and `.claude/rules/` (judgment-only); Pass with no conflict, else Pass and list each as `O3 <skill file:line> vs <rule file:line>` for `Open:` | the working repo has none of those files |

## Report format

First line the totals, then one table per skill:

```text
<skill>: <p> pass, <f> fail, <n> not checked

| Check | Result | Location (file:line) | Evidence | Proposed fix |
| --- | --- | --- | --- | --- |
| F4 | Fail | SKILL.md:3 | "…" (412 chars) | Replace with: "…" |
| F7 | Not checked | SKILL.md | no `when_to_use` | none |
```

A Fail row gives the exact `file:line` and the replacement text when short; every check gets one row, a Pass row included. Totals count F, S, Q, X, and T checks only; O1–O3 are listed apart.
