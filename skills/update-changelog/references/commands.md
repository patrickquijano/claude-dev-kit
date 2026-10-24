# Commands

| Name              | Command                                                       | Purpose                                        | MCP tool                                         |
| ----------------- | ------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| `root`            | `git rev-parse --show-toplevel`                               | Repository root (preloaded in Context)         | —                                                |
| `current-branch`  | `git rev-parse --abbrev-ref HEAD`                             | Current branch name (preloaded in Context)     | —                                                |
| `origin-url`      | `git remote get-url origin`                                   | Origin host                                    | —                                                |
| `pr-base`         | `gh pr list --head <current> --state open --json baseRefName` | Open PR base (GitHub)                          | `mcp__plugin_github_github__list_pull_requests`  |
| `mr-base`         | `glab mr list --source-branch <current> -F json`              | Open MR base (GitLab)                          | `mcp__plugin_gitlab_gitlab__list_merge_requests` |
| `default-branch`  | `git symbolic-ref --short refs/remotes/origin/HEAD`           | Origin default branch                          | —                                                |
| `fetch`           | `git fetch --prune origin`                                    | Refresh remote refs                            | —                                                |
| `merge-base`      | `git merge-base <base> HEAD`                                  | Range start                                    | —                                                |
| `latest-tag`      | `git tag --list --merged HEAD --sort=-v:refname`              | Latest reachable tag first                     | —                                                |
| `base-changelog`  | `git show <base>:<changelog path>`                            | Changelog on the base (released sections)      | —                                                |
| `tags`            | `git tag --list`                                              | All tags                                       | —                                                |
| `commits`         | `git log --no-merges --format='%h %s' <mb>..HEAD`             | Committed subjects                             | —                                                |
| `committed-names` | `git diff --name-status <mb>..HEAD`                           | Committed file changes                         | —                                                |
| `committed-stat`  | `git diff --stat <mb>..HEAD`                                  | Committed change sizes                         | —                                                |
| `status`          | `git status --porcelain=v1 -uall`                             | Working tree state                             | —                                                |
| `staged-names`    | `git diff --cached --name-status`                             | Staged file changes                            | —                                                |
| `unstaged-names`  | `git diff --name-status`                                      | Unstaged file changes                          | —                                                |
| `format-md`       | `<repo Markdown formatter command> <changelog path>`          | Repo-configured formatter; permission-prompted | —                                                |
