# Commands

| Name         | Command                         | Purpose                                |
| ------------ | ------------------------------- | -------------------------------------- |
| `repo-root`  | `git rev-parse --show-toplevel` | Repository root (preloaded in Context) |
| `dirty-tree` | `git status --porcelain`        | Uncommitted changes                    |
| `tool-check` | `command -v <package manager>`  | Package manager installed              |
| `diff-stat`  | `git diff --stat`               | Changed-file summary                   |
