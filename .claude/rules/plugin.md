---
paths:
  - .claude-plugin/**
---

# Plugin

- Version bumps for shipped components follow `.claude/rules/release.md`; installs stay pinned to the version they got.
- Verify: `plugin-dev:plugin-validator` agent.

## Skill conflicts

Shipped skill defaults that differ from this repo's rules. Here the project rule wins; the skill default is unchanged for other repos.

- `build-hook`: its hook template can block; `.claude/rules/hooks.md` makes plugin hooks advise-only.
- `setup-husky`, `setup-formatters`, `setup-linters`: they install dependencies; `.claude/rules/principles.md` asks first.
- `review-code-changes` (commits) and `switch-branch` (push): `.claude/CLAUDE.md` asks first outside a running skill's own step.
- `setup-graphify`: it installs git hooks; this repo uses Husky.
- `release-plugin`: its branch delete needs the ask in `.claude/CLAUDE.md` Boundaries.
