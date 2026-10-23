# Template

Replace every `<…>`; drop comments. Frontmatter fields: `references/frontmatter.md`. Body rules: `references/body.md`.

Path: `<scope root>/<name>.md`

````markdown
---
name: <kebab-case, no ":">
description: <Use proactively to <job> when <situation>. Read-only.> # ≤200 chars, no skill or agent names
tools: <minimal comma list> # read-only: Read, Grep, Glob
model: <haiku|sonnet|opus|fable|<full model id>>
effort: <low|medium|high|xhigh|max>
color: <red|blue|green|yellow|purple|orange|pink|cyan> # omit on No color
---

<Role, one line. Read-only agents say so.>

Rigor: verify every path, command, and claim against the files before stating it and return `Question:` instead of guessing, because the parent acts on this unverified; finish each step, reconsider the conclusion once, re-check it against the task's standards, keep the Return terse, and take the fewest reads that answer the task.

## Task

1. Inputs from the prompt: <every input this agent reads>. A required input missing → return `Question: <what is needed and why>` and stop.
2. <Step.>

## Return

```text
<fixed fields the parent uses, nothing else>
```
````
