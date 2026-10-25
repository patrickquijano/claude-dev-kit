# Commands

| Name                   | Command                                                                               | Purpose                                                                |
| ---------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `check-signing`        | `node ${CLAUDE_SKILL_DIR}/scripts/check-signing.mjs`                                  | JSON: `ok` or the failed signing checks (exit 1), run in the repo root |
| `classify`             | `node ${CLAUDE_SKILL_DIR}/scripts/classify-changes.mjs [--hints] [--paths <file>...]` | JSON: `path` small or analyzed, with reasons, run in the repo root     |
| `staged-names`         | `git diff --cached --name-only`                                                       | Staged files                                                           |
| `unstage`              | `git restore --staged :/`                                                             | Unstage everything                                                     |
| `status`               | `git status --porcelain=v1 -uall`                                                     | Changed and untracked files                                            |
| `scratch`              | `mktemp -d`                                                                           | Temp dir for message and patches                                       |
| `diff-head`            | `git diff HEAD`                                                                       | Tracked changes (inline analysis)                                      |
| `current-branch`       | `git rev-parse --abbrev-ref HEAD`                                                     | Current branch name (preloaded in Context)                             |
| `short-head`           | `git rev-parse --short HEAD`                                                          | Short sha for detached HEAD                                            |
| `default-branch`       | `git symbolic-ref --short refs/remotes/origin/HEAD`                                   | Origin default branch                                                  |
| `diff-file`            | `git diff <file>`                                                                     | Hunks of a mixed file                                                  |
| `local-branch-exists`  | `git show-ref --verify --quiet refs/heads/<name>`                                     | Exit 0 = branch exists locally                                         |
| `remote-branch-exists` | `git ls-remote --heads origin refs/heads/<name>`                                      | Non-empty = exists on origin                                           |
| `protected-gitlab`     | `glab api --paginate projects/:id/protected_branches`                                 | Protected branches (GitLab)                                            |
| `protected-github`     | `gh api repos/{owner}/{repo}/branches/{branch} --jq .protected`                       | `true` = branch is protected (GitHub)                                  |
| `commitlint`           | `npx --no-install commitlint --edit <scratch>/msg`                                    | Lint one subject                                                       |
| `switch-new`           | `git switch -c <target>`                                                              | Create and switch branch                                               |
| `stage-files`          | `git add -- <files>`                                                                  | Stage whole files                                                      |
| `stage-patch`          | `git apply --cached <scratch>/<n>.patch`                                              | Stage split hunks                                                      |
| `commit`               | `git commit -S -F <scratch>/msg`                                                      | Signed commit                                                          |
| `verify-log`           | `git log --format='%h %G? %s' -n <count>`                                             | Signature per commit                                                   |
| `tree-status`          | `git status`                                                                          | Remaining changes                                                      |
| `origin-url`           | `git remote get-url origin`                                                           | Origin exists                                                          |
