# Commands

| Name               | Command                                                                      | Purpose                               |
| ------------------ | ---------------------------------------------------------------------------- | ------------------------------------- |
| `git-version`      | `git --version`                                                              | git installed (preloaded in Context)  |
| `node-version`     | `node --version`                                                             | node installed (preloaded in Context) |
| `npx-version`      | `npx --version`                                                              | npx installed (preloaded in Context)  |
| `gh-version`       | `gh --version`                                                               | gh installed (GitHub)                 |
| `glab-version`     | `glab --version`                                                             | glab installed (GitLab)               |
| `gh-auth`          | `gh auth status`                                                             | gh authenticated                      |
| `glab-auth`        | `glab auth status`                                                           | glab authenticated                    |
| `signing-key`      | `git config --get user.signingkey`                                           | Signing key set                       |
| `signing-format`   | `git config --get gpg.format`                                                | Signing format                        |
| `signers-file`     | `git config --get gpg.ssh.allowedSignersFile`                                | SSH allowed signers file              |
| `default-branch`   | `git symbolic-ref --short refs/remotes/origin/HEAD`                          | Origin default branch                 |
| `fetch`            | `git fetch --prune origin`                                                   | Refresh remote refs                   |
| `git-dir-state`    | `git rev-parse --git-dir`                                                    | Locate merge or rebase state files    |
| `protected-branch` | `gh api repos/{owner}/{repo}/branches/{branch} --jq .protected`              | GitHub branch protection              |
| `gh-pr-list`       | `gh pr list --head <current> --state all --json number,state,url,headRefOid` | PRs for the branch                    |
| `glab-mr-list`     | `glab mr list --source-branch <current> -F json`                             | MRs for the branch                    |
| `unshipped-count`  | `git rev-list --count origin/<target>..HEAD`                                 | Commits not on target                 |
| `target-diff`      | `git diff origin/<target>...HEAD`                                            | Shipped change vs README              |
| `checks-poll`      | `gh pr checks <n> --required`                                                | One poll; exit 8 = checks pending     |
| `poll-wait`        | `sleep 30`                                                                   | Pause between check polls             |
| `glab-mr-view`     | `glab mr view <iid> -F json`                                                 | MR state and `head_pipeline`          |
| `switch-target`    | `git switch <target>`                                                        | Switch to the target                  |
| `ff-target`        | `git merge --ff-only origin/<target>`                                        | Fast-forward the target               |
| `is-ancestor`      | `git merge-base --is-ancestor <target> <source branch tip>`                  | Local commits are in the merge        |
| `run-list`         | `gh run list --branch <b>`                                                   | CI runs for a branch                  |
| `run-failed-log`   | `gh run view <id> --log-failed`                                              | Failed CI job logs                    |
| `glab-ci-log`      | `glab ci trace <job>`                                                        | GitLab CI job log                     |
