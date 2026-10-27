# Commands

| Name            | Command                                                                                                  | Purpose                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `repo-root`     | `git rev-parse --show-toplevel`                                                                          | Repo root; fail falls back to cwd (preloaded in Context)                                           |
| `format-readme` | the facts block's `Formatter:` command, run on one written file                                          | Formats each written file; not pre-approved (permission prompt expected); `Formatter: none` → skip |
| `tracked-files` | `git ls-files`                                                                                           | Tracked files; inline fallback of the step 3 analyst                                               |
| `remote-url`    | `git remote get-url origin`                                                                              | Host (github, gitlab, bitbucket, gitea, generic); inline fallback of the step 3 analyst            |
| `lint-readme`   | a known markdown linter binary (`markdownlint`, `markdownlint-cli2`, `mdl`) on `README.md`, no fix flags | F3 check in the inline scorer fallback; not pre-approved (permission prompt expected)              |
| `count-lines`   | `wc -l <files>`                                                                                          | Line count of each written file against the max (step 12)                                          |
