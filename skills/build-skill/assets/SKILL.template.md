# Skill template

Copy one skeleton, replace every `<…>`, drop the comments. Field rules: the frontmatter table in the rules reference.

````markdown
---
name: <kebab-name>
description: <What it does, third person>. Use when <trigger words>. # ≤200 chars, no skill names; side effects → end: Use only when the user explicitly asks to <action>.
argument-hint: '<[arg]>' # task only; omit when no arguments
disable-model-invocation: true # task with side effects
compatibility: Claude Code only. Uses <the Claude Code-only keys>; claude.ai and API uploads reject unknown keys. # required when any Claude Code-only key is set
allowed-tools: Read <least-privilege tools> # task only
# user-invocable: false # background-only: replaces argument-hint, disable-model-invocation, and allowed-tools
# paths: <globs> # reference that applies to certain files only
# context: fork # explicit task only; body must be self-contained
# background: false # with fork, when the result is needed this turn
---

# <Title>

<!-- Task: keep every section below. Reference and background-only: drop Input, Workflow, Output; use topic sections. -->

Input: $ARGUMENTS

## Rules

- <Constraint that must hold, most important first.>
- Loops: at most <n> rounds; then report what is left.

## Workflow

1. **<Label>.** <Imperative action; the condition that branches out.>
2. **<Label>.** <Side effect → ask first, naming the effect.>

## <Topic>

<!-- Reference: short imperative rules or a table. Background-only: facts and constraints, no steps. -->

- <Rule.>

## Files

- For <topic>, see `${CLAUDE_SKILL_DIR}/references/<file>.md`.

## Output

```text
<fixed fields>
Open: <what is left | none>
Next: <follow-up> | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
````
