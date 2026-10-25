# Commands

| Name           | Command                                                 | Purpose                                                                                                                  |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `repo-root`    | `git rev-parse --show-toplevel`                         | Repo root; fail falls back to cwd (preloaded in Context)                                                                 |
| `format-files` | the facts block's `Formatter` command, run on the files | Format the files written this run; `none` → skip; runs prompt for permission (not pre-approved)                          |
| `delete-file`  | `git rm -- <path>`                                      | Delete a tracked file; tracked only, permission-prompted (not pre-approved); undo with `git restore --staged --worktree` |
