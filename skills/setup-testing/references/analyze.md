# Analyze

Details steps 1 and 2 of `${CLAUDE_SKILL_DIR}/SKILL.md`; commands by name in `${CLAUDE_SKILL_DIR}/references/commands.md`.

## Pre-flight

- `git-dir` shows `rebase-merge`, `rebase-apply`, or `MERGE_HEAD` → stop.
- List files with `list-files`; find package manifests from `${CLAUDE_SKILL_DIR}/references/stacks.md` Signals (monorepo → one package each).
- Detect the JS package manager per package-manager.md Detect; ambiguous → ask here.
- Probe `docker-info`; failure → note it, and container-based integration then falls back to fakes.

## Analyzer inputs

Per package: package path, kind `setup`, scope `all`, package manager (`n/a` for non-JS), and the paths of stacks.md, `${CLAUDE_SKILL_DIR}/references/layout.md`, and `${CLAUDE_SKILL_DIR}/../write-unit-tests/references/conventions.md`; on a re-spawn, the answers to the earlier `Questions:`.
