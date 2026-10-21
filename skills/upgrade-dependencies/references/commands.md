# Commands

| Name             | Command                                                      | Purpose                                                                                           |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `repo-root`      | `git rev-parse --show-toplevel`                              | Repository root (preloaded in Context)                                                            |
| `dirty-tree`     | `git status --porcelain`                                     | Uncommitted changes                                                                               |
| `tool-check`     | `command -v <package manager>`                               | Package manager installed                                                                         |
| `diff-stat`      | `git diff --stat`                                            | Changed-file summary                                                                              |
| `checkpoint`     | `git stash create`                                           | Checkpoint commit before each package; empty output → `git rev-parse HEAD`; touches no stash list |
| `restore-files`  | `git restore --source=<checkpoint sha> --worktree -- <file>` | Revert one changed file of a failed package to its checkpoint                                     |
| `frozen-install` | the project's row in `managers.md` `## Frozen install`       | Install from the lockfile without rewriting it (step 9)                                           |
