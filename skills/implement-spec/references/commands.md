# Commands

| Name           | Command                           | Purpose                                                                                          |
| -------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `root`         | `git rev-parse --show-toplevel`   | Repo root (preloaded in Context)                                                                 |
| `branch`       | `git rev-parse --abbrev-ref HEAD` | Current branch (preloaded in Context)                                                            |
| `status`       | `git status --porcelain=v1`       | Changed paths (preloaded in Context); re-run after the implementer and compare with the baseline |
| `diff-stat`    | `git diff --stat`                 | Show the change set at validate time (diff)                                                      |
| `dirty-diff`   | `git diff -- <path>`              | Diff of one Dirty path: save at pre-flight, compare after the implementer                        |
| `restore-path` | `git restore -- <path>`           | Revert one newly changed path the user chose to revert; never a Dirty path (permission-prompted) |
