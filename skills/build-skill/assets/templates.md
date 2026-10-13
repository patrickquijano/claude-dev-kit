# Templates

Replace every `<…>`; drop comments. Frontmatter fields: `references/frontmatter.md`.

## Task

````markdown
---
name: <kebab-name>
description: <What it does, third person>. Use when <trigger words>. # side effects → add: Use only when the user explicitly asks to <action>.
argument-hint: '<[arg]>' # omit when no arguments
disable-model-invocation: true # side effects only
---

# <Title>

Input: $ARGUMENTS

## Rules

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
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
````

## Reference

```markdown
---
name: <kebab-name>
description: <Conventions it holds, third person>. Use when <work it applies to>.
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
description: <What this context covers>. Use when <situations Claude should load it>.
user-invocable: false
# disable-model-invocation: true # only to block Claude from loading it too
---

# <Title>

## <Topic>

<Facts and constraints, grouped by topic. No steps, no output.>
```
