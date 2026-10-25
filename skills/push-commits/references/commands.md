# Commands

`<branch>` is the literal name from `current-branch`, always in single quotes; `<sha>` is a literal sha.

| Name             | Command                                                    | Purpose                                                    | MCP tool |
| ---------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | -------- |
| `current-branch` | `git rev-parse --abbrev-ref HEAD`                          | Current branch; `HEAD` = detached                          | —        |
| `origin-url`     | `git remote get-url origin`                                | Origin exists                                              | —        |
| `default-branch` | `git symbolic-ref --short refs/remotes/origin/HEAD`        | Origin default branch                                      | —        |
| `upstream`       | `git rev-parse --abbrev-ref @{u}`                          | Upstream ref name                                          | —        |
| `pending-count`  | `git rev-list --count HEAD --not --remotes=origin`         | Commits on no origin ref; `0` = nothing pending            | —        |
| `pending-log`    | `git log --format='%h %G? %s' HEAD --not --remotes=origin` | Hash, signature status, and subject of each pending commit | —        |
| `head-sha`       | `git rev-parse HEAD`                                       | HEAD sha, recorded at step 3                               | —        |
| `remote-head`    | `git ls-remote --heads origin 'refs/heads/<branch>'`       | Remote branch sha; empty = not on remote                   | —        |
| `is-ancestor`    | `git merge-base --is-ancestor <sha> HEAD`                  | Exit 0 = remote sha is in HEAD                             | —        |
| `push`           | `git push origin HEAD:'<branch>'`                          | Publish branch                                             | —        |
| `push-upstream`  | `git push -u origin HEAD:'<branch>'`                       | Publish and set upstream                                   | —        |
