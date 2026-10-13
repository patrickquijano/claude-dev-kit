# Commands

| Name                   | Command                                             | Purpose                                               |
| ---------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `inside-work-tree`     | `git rev-parse --is-inside-work-tree`               | Fails outside a git repo                              |
| `status`               | `git status`                                        | Shows rebase, merge, cherry-pick                      |
| `origin-url`           | `git remote get-url origin`                         | Succeeds when origin exists (preloaded in Context)    |
| `staged-files`         | `git diff --cached --name-only`                     | Staged file names                                     |
| `unstage`              | `git restore --staged :/`                           | Unstage everything                                    |
| `current-branch`       | `git rev-parse --abbrev-ref HEAD`                   | Branch name; `HEAD` = detached (preloaded in Context) |
| `short-head`           | `git rev-parse --short HEAD`                        | Short sha for detached HEAD                           |
| `origin-head`          | `git symbolic-ref --short refs/remotes/origin/HEAD` | Default branch ref                                    |
| `verify-ref`           | `git rev-parse --verify --quiet <ref>`              | Ref resolves                                          |
| `verify-full-ref`      | `git show-ref --verify --quiet <full ref>`          | Full ref resolves                                     |
| `unique-commits`       | `git rev-list --count <base>..HEAD`                 | Commits unique to the branch                          |
| `changes`              | `git status --porcelain=v1 -uall`                   | Uncommitted changes                                   |
| `local-branch-exists`  | `git show-ref --verify --quiet refs/heads/<name>`   | Exit 0 = name taken locally                           |
| `remote-branch-exists` | `git ls-remote --heads origin refs/heads/<name>`    | Non-empty = name taken on origin                      |
| `switch`               | `git switch -c <name>`                              | Create and switch to the branch                       |
| `push`                 | `git push -u origin <name>`                         | Push and set upstream                                 |
