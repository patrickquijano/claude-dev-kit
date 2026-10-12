# Commands

| Name        | Command                                                                                  | Purpose                         |
| ----------- | ---------------------------------------------------------------------------------------- | ------------------------------- |
| `repo-root` | `git rev-parse --show-toplevel`                                                          | Repo root; fails outside git    |
| `bump`      | `node ${CLAUDE_SKILL_DIR}/../../hooks/scripts/release-check.mjs bump --json`             | Set version files, print JSON   |
| `check`     | `node ${CLAUDE_SKILL_DIR}/../../hooks/scripts/release-check.mjs check --pre-push --json` | Re-verify version and changelog |
