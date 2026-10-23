# Templates

Replace every `<…>`; drop comments. Frontmatter fields: `references/frontmatter.md`.

Link only files inside this skill (`${CLAUDE_SKILL_DIR}/…`); copy, never link, another skill's files.

## Task

````markdown
---
name: <kebab-name>
description: <What it does, third person>. Use when <trigger words>. # ≤200 chars, no skill names; side effects → end: Use only when the user explicitly asks to <action>[, or when chained].
argument-hint: '<[arg]>' # omit when no arguments
disable-model-invocation: true # side effects only
---

# <Title>

Input: $ARGUMENTS

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`; each spawn gets a complete brief (agent, kind, literal inputs, scope, return block; missing or ambiguous → `Question:`, never assume).
- <Constraint that must hold, most important first.>
- Loops: at most <n> rounds; then report what is left.

## Workflow

1. **<Label>.** <Imperative action; the condition that branches out.>
2. **<Label>.** <Side effect → ask first, naming the effect.>

## Files # only when bundled files exist

- For <topic>, see `${CLAUDE_SKILL_DIR}/references/<file>`.

## Output

```text
<fixed fields>
Open: <what is left | none>
Next: <follow-up> | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
````

## Reference

```markdown
---
name: <kebab-name>
description: <Conventions it holds, third person>. Use when <work it applies to>. # ≤200 chars, no skill names
paths: <globs> # optional: only when it applies to certain files
---

# <Title>

## <Topic>

- <Short imperative rule.>

## <Topic>

| <Col>   | <Col>   |
| ------- | ------- |
| <value> | <value> |

## Files # only when bundled files exist

- For <topic>, see `${CLAUDE_SKILL_DIR}/references/<file>`.
```

## Background-only

```markdown
---
name: <kebab-name>
description: <What this context covers>. Use when <situations Claude should load it>. # ≤200 chars, no skill names
user-invocable: false
# disable-model-invocation: true # only to block Claude from loading it too
---

# <Title>

## <Topic>

<Facts and constraints, grouped by topic. No steps, no output.>
```
