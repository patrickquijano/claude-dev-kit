# Commands

| Name             | Command                                                | Purpose                                         | MCP tool |
| ---------------- | ------------------------------------------------------ | ----------------------------------------------- | -------- |
| `current-branch` | `git rev-parse --abbrev-ref HEAD`                      | Current branch; `HEAD` = detached               | —        |
| `origin-url`     | `git remote get-url origin`                            | Origin exists                                   | —        |
| `default-branch` | `git symbolic-ref --short refs/remotes/origin/HEAD`    | Origin default branch                           | —        |
| `upstream`       | `git rev-parse --abbrev-ref @{u}`                      | Upstream ref name                               | —        |
| `pending-count`  | `git rev-list --count HEAD --not --remotes=origin`     | Commits on no origin ref; `0` = nothing pending | —        |
| `pending-log`    | `git log --format='%h %s' HEAD --not --remotes=origin` | Hash and subject of each pending commit         | —        |
| `push`           | `git push origin HEAD:<branch>`                        | Publish branch                                  | —        |
| `push-upstream`  | `git push -u origin HEAD:<branch>`                     | Publish and set upstream                        | —        |
