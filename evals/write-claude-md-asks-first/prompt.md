---
description: CLAUDE.md request triggers write-claude-md, which asks about conflicts or missing facts before writing memory files, never inventing commands or policies.
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill, Agent, Write, Edit]
---

Update CLAUDE.md for this repo and add a rule: always run tests before committing.
