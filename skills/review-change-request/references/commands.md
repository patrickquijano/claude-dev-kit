# Commands

Host commands (`gh`, `glab`) are in `github.md` and `gitlab.md`.

| Name            | Command                                           | Purpose                                     |
| --------------- | ------------------------------------------------- | ------------------------------------------- |
| `origin-url`    | `git remote get-url origin`                       | Host detection (preloaded in Context)       |
| `inside-tree`   | `git rev-parse --is-inside-work-tree`             | Must print `true`                           |
| `root`          | `git rev-parse --show-toplevel`                   | Repository root                             |
| `branch`        | `git rev-parse --abbrev-ref HEAD`                 | Current branch; `HEAD` = detached, no match |
| `remotes`       | `git remote`                                      | At least one remote must exist              |
| `head-sha`      | `git rev-parse HEAD`                              | Local checks gate                           |
| `tree-status`   | `git status --porcelain`                          | Empty = clean tree (local checks gate)      |
| `diff-numstat`  | `git diff --numstat <mb>..<head>`                 | Direct-review size criteria                 |
| `has-commit`    | `git cat-file -e <sha>^{commit}`                  | Is a commit present locally                 |
| `merge-base`    | `git merge-base <base> <head>`                    | Fork point of the CR                        |
| `fetch-pr-head` | `git fetch <remote> pull/<n>/head`                | Fetch a missing GitHub PR head or base      |
| `fetch-mr-head` | `git fetch origin refs/merge-requests/<iid>/head` | Fetch a missing GitLab MR head or base      |
| `local-diff`    | `git diff <mb>..<head>`                           | Diff fallback and GitLab diff               |
| `local-names`   | `git diff --name-status <mb>..<head>`             | Changed files with status (fallback)        |
| `local-log`     | `git log <mb>..<head>`                            | Commit log (fallback)                       |
| `tracked-files` | `git ls-files`                                    | Resolve a tracked path                      |
| `scratch`       | `mktemp -d`                                       | Scratch directory (diffs, bodies, payloads) |
