# Subagent template

Path: `<root>/agents/<name>.md`

```markdown
---
name: <kebab-case, no ":">
description: <when to delegate>. <one-line scope>. Read-only. Spawned by the [<plugin>:]<skill> skill; do not use directly. # "Read-only." only when tools are read-only; "Spawned by …" only when a skill spawns the agent
tools: <minimal comma list>
model: <haiku|inherit> # only when needed: haiku cheap lookups, inherit otherwise
---

<Role, one line.>

## Task

1. <step>

## Return

<concise fixed structure; parent sees only this>
Issue hit + fix → add line `Known issue: <symptom> → <fix>`; parent decides whether to save it to the known-issues store.
```
