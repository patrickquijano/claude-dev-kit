# Template

Replace every `<…>`; drop comments. Frontmatter fields: `references/frontmatter.md`. Body rules: `references/body.md`.

Path: `<scope root>/<name>.md`

````markdown
---
name: <kebab-case, no ":">
description: <Use proactively to <job> when <situation>. Read-only.> # ≤200 chars, no skill or agent names
tools: <minimal comma list> # read-only: Read, Grep, Glob
model: <haiku|sonnet|opus|fable|<full model id>> # omit on inherit
color: <red|blue|green|yellow|purple|orange|pink|cyan> # omit on No color
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
