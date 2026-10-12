# Commands

| Name              | Command                                            | Purpose                                           |
| ----------------- | -------------------------------------------------- | ------------------------------------------------- |
| `origin-url`      | `git remote get-url origin`                        | Origin URL, picks the host (preloaded in Context) |
| `git-path`        | `git rev-parse --git-path <name>`                  | Path of a git state file                          |
| `dirty-paths`     | `git status --porcelain=v1`                        | Uncommitted paths (Dirty)                         |
| `fetch-head`      | `git fetch <remote> <head>`                        | Fetch the CR head branch                          |
| `head-diff-names` | `git diff --name-only <current> <remote>/<head>`   | Paths differing between branches                  |
| `switch-track`    | `git switch --track <remote>/<head>`               | Create local tracking branch                      |
| `pull-ff`         | `git pull --ff-only <remote> <head>`               | Fast-forward to remote head                       |
| `remote-head-sha` | `git rev-parse <remote>/<head>`                    | Fetched head SHA                                  |
| `show-head-file`  | `git show HEAD:<path>`                             | File content at HEAD                              |
| `diff-head`       | `git diff HEAD`                                    | Changes against HEAD                              |
| `diff-stat`       | `git diff --stat`                                  | Change summary                                    |
| `commitlint`      | `npx --no-install commitlint --edit <scratch>/msg` | Check the commit subject                          |
| `stage-files`     | `git add -- <files>`                               | Stage explicit paths                              |
| `commit`          | `git commit -S -F <scratch>/msg`                   | Signed commit                                     |
| `signatures`      | `git log --format='%h %G?' <headSha>..HEAD`        | Signature flag per commit                         |
| `push`            | `git push <remote> HEAD:<head>`                    | Push to the CR head branch                        |
