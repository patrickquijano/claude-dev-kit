---
paths:
  - 'skills/**'
  - '.claude/skills/**'
  - 'agents/**'
---

# Skills and subagents

- Skills follow `skills/build-skill/references/rules.md`; subagents follow `skills/build-subagent/references/agent-checklist.md`.
- Each skill reads only its own files through `${CLAUDE_SKILL_DIR}`, never a `${CLAUDE_PLUGIN_ROOT}` path. It may invoke another skill as ``Invoke the `cdk:<skill>` skill (fallback: run the <skill> skill)``; never a skill command on a `Next:` line.
- A spawn names the plugin subagent first: ``Spawn the `cdk:<agent>` subagent (fallback: <role in plain words>)``; no plugin agent fits → the role in plain words only. An inline fallback is always required; never spawn `Explore` or `general-purpose`.
- A task skill takes `--yes` (unattended: no plan mode, no questions, recommended options, assumptions under `Open:`) and, with a plan mode, `--no-plan` (skips plan mode only; every question is still asked); only a flag the user passed counts. `--yes` never covers a destructive step (admin-bypass merge, force-push, branch delete, `git reset --hard`, overwriting a dirty or unnamed file).
- Git ownership: A skill other than `switch-branch` never switches, creates, or checks out a branch. A skill other than `commit-changes` never commits. Others invoke the owning skill in the skill-call form above (fallback: plain language). Exceptions: `rebase-onto` replays existing commits during a rebase, and a branch that a third-party tool creates (Spec Kit's git hook in `run-spec-kit`) is reported, never made by the skill, and the project skill `release-plugin` runs `git switch <default>` once after the merge to fast-forward the default branch (not a work branch). A file-level `git checkout --ours/--theirs` and the dangling `git commit-tree` smoke test in `setup-git` are not branch switches or commits.
- Exception: a project skill in `.claude/skills/` reads this repo's `skills/<name>/` files to follow their instructions, so a release runs the branch's skill text, not the installed plugin's. It may invoke a skill in the standard form above, keeping the fallback of following the repo's `skills/<name>/SKILL.md`. When it follows a skill with `--yes` behavior, its step 1 approval names the exact gated actions it pre-answers; anything unnamed is still asked.
- Verify: `claude plugin validate --strict .`, then `npm test`; a project skill also passes `node skills/build-skill/scripts/validate-skill.mjs .claude/skills/<name> --kind task`.
