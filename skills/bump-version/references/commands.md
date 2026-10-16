# Commands

| Name        | Command                                                                      | Purpose                                             |
| ----------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| `repo-root` | `git rev-parse --show-toplevel`                                              | Repo root; fails outside git (preloaded in Context) |
| `check`     | `node ${CLAUDE_SKILL_DIR}/scripts/release-check.mjs check --pre-push --json` | Validate version and changelog, print JSON          |
| `bump`      | `node ${CLAUDE_SKILL_DIR}/scripts/release-check.mjs bump --json`             | Set version files, print JSON                       |

Add `--target <branch>` and `--subject <path>` to `check` and `bump` when the input gives them.
