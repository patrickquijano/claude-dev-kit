---
description: Dependency upgrade request triggers upgrade-dependencies, which reports outdated packages and asks before changing any manifest or lockfile.
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill, Agent, Bash]
---

Upgrade all the outdated dependencies in this project to their latest versions.
