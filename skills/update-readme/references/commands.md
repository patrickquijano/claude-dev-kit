# Commands

| Name            | Command                                                                                                  | Purpose                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `repo-root`     | `git rev-parse --show-toplevel`                                                                          | Repo root; fail falls back to cwd (preloaded in Context)                                                     |
| `format-readme` | the facts block's `Formatter:` command, run on `README.md` only                                          | Formats the README after each write; not pre-approved (permission prompt expected); `Formatter: none` → skip |
| `tracked-files` | `git ls-files`                                                                                           | Tracked files; inline fallback of the step 2 analyst                                                         |
| `remote-url`    | `git remote get-url origin`                                                                              | Host (github, gitlab, other); inline fallback of the step 2 analyst                                          |
| `lint-readme`   | a known markdown linter binary (`markdownlint`, `markdownlint-cli2`, `mdl`) on `README.md`, no fix flags | F3 check in the inline scorer fallback; not pre-approved (permission prompt expected)                        |
