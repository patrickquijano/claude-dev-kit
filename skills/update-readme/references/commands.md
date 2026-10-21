# Commands

| Name            | Command                                                         | Purpose                                                                                                      |
| --------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `repo-root`     | `git rev-parse --show-toplevel`                                 | Repo root; fail falls back to cwd (preloaded in Context)                                                     |
| `format-readme` | the facts block's `Formatter:` command, run on `README.md` only | Formats the README after each write; not pre-approved (permission prompt expected); `Formatter: none` → skip |
