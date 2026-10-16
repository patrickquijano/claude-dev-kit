# Commands

| Name                | Command                                              | Purpose                                |
| ------------------- | ---------------------------------------------------- | -------------------------------------- |
| `origin-url`        | `git remote get-url origin`                          | Detect the host (preloaded in Context) |
| `merge-base`        | `git merge-base <target ref> HEAD`                   | Range start `mb`                       |
| `range-count`       | `git rev-list --count <mb>..HEAD`                    | Commits in range                       |
| `range-diff`        | `git diff <mb>..HEAD`                                | Full diff                              |
| `range-name-status` | `git diff --name-status <mb>..HEAD`                  | Changed files                          |
| `range-log`         | `git log --format='%h %s' <mb>..HEAD`                | Commit subjects                        |
| `unpushed-count`    | `git rev-list --count @{u}..HEAD`                    | Commits not yet pushed                 |
| `dirty-check`       | `git status --porcelain=v1 --untracked-files=all`    | Clean-tree check before remediation    |
| `commitlint`        | `npx --no-install commitlint --edit <scratch>/title` | Lint the CR title                      |
