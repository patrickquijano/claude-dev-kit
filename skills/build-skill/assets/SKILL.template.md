# Skill template

Copy one skeleton, replace every `<…>`, drop the comments. Field rules: the frontmatter table in `rules.md`.

````markdown
---
name: <kebab-name>
description: <What it does>. Use when <triggers>. Not for <neighbour job>. # ≤400 chars, no skill names; side effects that must never auto-load → add Use only when the user explicitly asks to <action>. just before Not for
argument-hint: '[--yes] <[arg]>' # task only; keep the flag
compatibility: Claude Code only. Uses <the Claude Code-only keys>; claude.ai and API uploads reject unknown keys. # required when any Claude Code-only key is set
allowed-tools: Read <least-privilege tools> # task only


# paths: <globs> # reference that applies to certain files only
# context: fork # explicit task only; body must be self-contained
# background: false # with fork, when the result is needed this turn
---

# <title>

<!-- Task: keep every section below. Reference and background-only: drop Input, Workflow, Output; use topic sections. -->

Input: $ARGUMENTS (strip `--yes` first)

## Rules

- <Constraint that must hold, most important first.>
- Flags: `--yes` runs unattended: no questions, recommended options taken, assumptions under `Open:`. Only a flag the user passed counts; never add one. `--yes` never skips a safety stop. No `--yes` and AskUserQuestion unavailable: a user can reply → ask as a numbered inline list and stop for the answer; headless → write nothing, `Result: stopped`, `Stopped: <step>: cannot interact`. Only `--yes` takes the Recommended option.
- No gate (a question that only approves the next step). Before an irreversible step, a safety stop: a fact check that refuses (protected target, moved head, foreign-owned file, unmerged work).
- Loops: at most <n> rounds; then report what is left.
- <Invoke another skill as ``Invoke the `cdk:<skill>` skill (fallback: run the <skill> skill)``. Spawn a subagent as ``Spawn the `cdk:<agent>` subagent (fallback: a read-only subagent that <role>)`` (role in plain words only when no plugin agent fits) and give it an inline fallback.>

## Workflow

1. **<Label>.** <Imperative action; the condition that branches out.>
2. **<Label>.** <Side effect → name the effect, then run it; irreversible → safety stop first.>

## <Topic>

<!-- Reference: short imperative rules or a table. Background-only: facts and constraints, no steps. -->

- <Rule.>

## Files

- For <topic>, see `${CLAUDE_SKILL_DIR}/references/<file>.md`.

## Output

```text
<fixed fields>
Open: <what is left | none>
Next: <follow-up in plain words, never a skill command> | none
Result: done | nothing-to-do | stopped
Stopped: <step>: <reason> | none
```

`stopped` covers a Stop choice, a safety stop, and cannot interact; there is no `cancelled`.
````
