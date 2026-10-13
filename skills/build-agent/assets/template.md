# Template

Replace every `<…>`; drop comments. Frontmatter fields: `references/frontmatter.md`. Body rules: `references/body.md`.

Path: `<scope root>/<name>.md`

````markdown
---
name: <kebab-case, no ":">
description: <When to delegate, one or two short sentences.> # spawned by a skill → end: Spawned by the <skill> skill; do not use directly.
tools: <minimal comma list> # read-only: Read, Grep, Glob
model: <haiku|sonnet|opus|inherit> # omit to follow the main model
---

<Role, one line. Read-only agents say so.>

## Task

1. Inputs from the prompt: <every input this agent reads>. A required input missing → return `Question: <what is needed and why>` and stop.
2. <Step.>

## Return

```text
<fixed fields the parent uses, nothing else>
```
````
