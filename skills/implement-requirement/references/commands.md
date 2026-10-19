# Commands

| Name        | Command                           | Purpose                                     |
| ----------- | --------------------------------- | ------------------------------------------- |
| `root`      | `git rev-parse --show-toplevel`   | Repo root (preloaded in Context)            |
| `branch`    | `git rev-parse --abbrev-ref HEAD` | Current branch (preloaded in Context)       |
| `status`    | `git status --porcelain=v1`       | Changed paths (preloaded in Context)        |
| `diff-stat` | `git diff --stat`                 | Show the change set at validate time (diff) |
