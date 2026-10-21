# Commands

| Name           | Command                         | Purpose                                                                                                                                     |
| -------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `repo-root`    | `git rev-parse --show-toplevel` | Repo root; preloaded in Context.                                                                                                            |
| `check-ignore` | `git check-ignore -v <path>...` | Shows which rule ignores each path; paths are repo-relative to the root, never a leading `/` pattern; exit 1 when none is, which is a miss. |
