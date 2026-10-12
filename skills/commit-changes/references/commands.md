# Commands

| Name                   | Command                                             | Purpose                                    |
| ---------------------- | --------------------------------------------------- | ------------------------------------------ |
| `staged-names`         | `git diff --cached --name-only`                     | Staged files                               |
| `unstage`              | `git restore --staged :/`                           | Unstage everything                         |
| `status`               | `git status --porcelain=v1 -uall`                   | Changed and untracked files                |
| `scratch`              | `mktemp -d`                                         | Temp dir for message and patches           |
| `numstat`              | `git diff HEAD --numstat`                           | Per-file line counts                       |
| `untracked-numstat`    | `git diff --no-index --numstat -- /dev/null <file>` | Line counts of an untracked file           |
| `diff-head`            | `git diff HEAD`                                     | Tracked changes for secret scan            |
| `current-branch`       | `git rev-parse --abbrev-ref HEAD`                   | Current branch name (preloaded in Context) |
| `short-head`           | `git rev-parse --short HEAD`                        | Short sha for detached HEAD                |
| `default-branch`       | `git symbolic-ref --short refs/remotes/origin/HEAD` | Origin default branch                      |
| `diff-file`            | `git diff <file>`                                   | Hunks of a mixed file                      |
| `local-branch-exists`  | `git show-ref --verify --quiet refs/heads/<name>`   | Exit 0 = branch exists locally             |
| `remote-branch-exists` | `git ls-remote --heads origin refs/heads/<name>`    | Non-empty = exists on origin               |
| `commitlint`           | `npx --no-install commitlint --edit <scratch>/msg`  | Lint one subject                           |
| `switch-branch`        | `git switch -c <target>`                            | Create and switch branch                   |
| `stage-files`          | `git add -- <files>`                                | Stage whole files                          |
| `stage-patch`          | `git apply --cached <scratch>/<n>.patch`            | Stage split hunks                          |
| `commit`               | `git commit -S -F <scratch>/msg`                    | Signed commit                              |
| `verify-log`           | `git log --format='%h %G? %s' -n <count>`           | Signature per commit                       |
| `tree-status`          | `git status`                                        | Remaining changes                          |
| `origin-url`           | `git remote get-url origin`                         | Origin exists                              |
| `upstream`             | `git rev-parse --abbrev-ref @{u}`                   | Upstream ref name                          |
| `push`                 | `git push origin HEAD:<branch>`                     | Publish branch                             |
| `push-upstream`        | `git push -u origin HEAD:<branch>`                  | Publish and set upstream                   |
