# Commands

| Name              | Command                                                                      | Purpose                                    |
| ----------------- | ---------------------------------------------------------------------------- | ------------------------------------------ |
| `git-version`     | `git --version`                                                              | git installed (preloaded in Context)       |
| `node-version`    | `node --version`                                                             | node installed (preloaded in Context)      |
| `npx-version`     | `npx --version`                                                              | npx installed (preloaded in Context)       |
| `gh-version`      | `gh --version`                                                               | gh installed (GitHub)                      |
| `glab-version`    | `glab --version`                                                             | glab installed (GitLab)                    |
| `root`            | `git rev-parse --show-toplevel`                                              | Repository root (preloaded in Context)     |
| `gh-auth`         | `gh auth status`                                                             | gh authenticated                           |
| `glab-auth`       | `glab auth status`                                                           | glab authenticated                         |
| `default-branch`  | `git symbolic-ref --short refs/remotes/origin/HEAD`                          | Origin default branch                      |
| `fetch`           | `git fetch --prune origin`                                                   | Refresh remote refs                        |
| `marker-path`     | `git rev-parse --path-format=absolute --git-path cdk-ship-release`           | Absolute hold-marker path                  |
| `origin-url`      | `git remote get-url origin`                                                  | Host detection (preloaded in Context)      |
| `current-branch`  | `git rev-parse --abbrev-ref HEAD`                                            | Current branch name (preloaded in Context) |
| `gh-pr-list`      | `gh pr list --head <current> --state all --json number,state,url,headRefOid` | PRs for the branch                         |
| `glab-mr-list`    | `glab mr list --source-branch <current> -F json`                             | MRs for the branch                         |
| `unshipped-count` | `git rev-list --count origin/<target>..HEAD`                                 | Commits not on target                      |
| `target-diff`     | `git diff origin/<target>...HEAD`                                            | Shipped change vs README                   |
| `checks-watch`    | `gh pr checks <n> --required --watch`                                        | Wait for required checks                   |
| `switch-target`   | `git switch <target>`                                                        | Switch to the target                       |
| `ff-target`       | `git merge --ff-only origin/<target>`                                        | Fast-forward the target                    |
| `is-ancestor`     | `git merge-base --is-ancestor <target> <source branch tip>`                  | Local commits are in the merge             |
| `remove-marker`   | `rm -f -- <absolute marker path>`                                            | Delete the hold marker                     |
| `run-list`        | `gh run list --branch <b>`                                                   | CI runs for a branch                       |
| `run-failed-log`  | `gh run view <id> --log-failed`                                              | Failed CI job logs                         |
| `glab-ci-log`     | `glab ci trace <job>`                                                        | GitLab CI job log                          |
