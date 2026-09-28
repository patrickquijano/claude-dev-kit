---
description: /cdk:setup-test-hook in a repo whose .claude/settings.json already runs tests on Stop asks before replacing or duplicating that hook.
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill, Bash, Write, Edit]
---

/cdk:setup-test-hook Add a Claude Code hook that runs my unit tests when Claude finishes. Note: `.claude/settings.json` already has a `Stop` hook running `npx vitest run`.
