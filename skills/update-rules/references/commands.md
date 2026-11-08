# Commands

| Name            | Command                                                     | Purpose                                                                                                                                                                                          |
| --------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `repo-root`     | `git rev-parse --show-toplevel`                             | Repo root; fail falls back to cwd (preloaded in Context)                                                                                                                                         |
| `tracked-files` | `git ls-files`                                              | Tracked files; inline fallback of the step 2 analyst                                                                                                                                             |
| `count-context` | `node ${CLAUDE_SKILL_DIR}/scripts/count-context.mjs <root>` | Read-only JSON: non-blank line counts of always-loaded files (`project`, `ancestors`, `alwaysLoaded` as `<project n> + <ancestor n>`) and each `paths` glob's tracked-file match count (`rules`) |
