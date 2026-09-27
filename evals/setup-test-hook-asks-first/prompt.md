---
description: Test hook setup request in a repo whose .claude/settings.json already runs tests on Stop triggers setup-test-hook, which asks before replacing or duplicating that hook.
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill, Bash, Write, Edit]
---

Add a Claude Code hook that runs all my tests when Claude finishes. Note: `.claude/settings.json` already has a `Stop` hook running `npx vitest run`.
