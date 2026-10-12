# Commands

| Name        | Command                                                                                      | Purpose                                             |
| ----------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `repo-root` | `git rev-parse --show-toplevel`                                                              | Repo root; fails outside git (preloaded in Context) |
| `bump`      | `node ${CLAUDE_SKILL_DIR}/../../hooks/scripts/lib/release-check.mjs bump --json`             | Set version files, print JSON                       |
| `check`     | `node ${CLAUDE_SKILL_DIR}/../../hooks/scripts/lib/release-check.mjs check --pre-push --json` | Re-verify version and changelog                     |
