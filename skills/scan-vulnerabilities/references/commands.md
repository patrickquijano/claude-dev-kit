# Commands

| Name                   | Command                                             | Purpose                        |
| ---------------------- | --------------------------------------------------- | ------------------------------ |
| `repo-root`            | `git rev-parse --show-toplevel`                     | Repository root                |
| `docker-info`          | `docker info`                                       | Docker availability            |
| `status-porcelain`     | `git status --porcelain`                            | Uncommitted and unmerged paths |
| `check-ignore-reports` | `git check-ignore -q .vulnerability-reports/`       | Reports dir already ignored    |
| `tracked-files`        | `git ls-files`                                      | File is tracked                |
| `default-branch`       | `git symbolic-ref --short refs/remotes/origin/HEAD` | Default branch with `origin/`  |
