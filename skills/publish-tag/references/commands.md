# Commands

| Name             | Command                                             | Purpose                                    |
| ---------------- | --------------------------------------------------- | ------------------------------------------ |
| `root`           | `git rev-parse --show-toplevel`                     | Repository root (preloaded in Context)     |
| `current-branch` | `git rev-parse --abbrev-ref HEAD`                   | Current branch name (preloaded in Context) |
| `fetch`          | `git fetch --prune origin`                          | Refresh remote refs                        |
| `fetch-tags`     | `git fetch origin --tags`                           | Fetch tags, no force                       |
| `default-branch` | `git symbolic-ref --short refs/remotes/origin/HEAD` | Origin default branch (`origin/<name>`)    |
| `ff-default`     | `git merge --ff-only origin/<default>`              | Fast-forward the default branch            |
| `head-sha`       | `git rev-parse HEAD`                                | Local tip                                  |
| `origin-tip`     | `git rev-parse origin/<default>`                    | Remote tip                                 |
| `changelog-head` | `git show HEAD:CHANGELOG.md`                        | Committed changelog; first `## [x.y.z]`    |
| `list-tags`      | `git tag --list`                                    | Existing tags, for prefix detection        |
| `local-tag`      | `git rev-parse -q --verify "refs/tags/<tag>"`       | Local tag exists (exit 1 = absent)         |
| `remote-tag`     | `git ls-remote origin "refs/tags/<tag>"`            | Remote tag exists (empty output = absent)  |
| `create-tag`     | `git tag -a <tag> -m "Release <version>" <commit>`  | Annotated tag at the verified commit       |
| `push-tag`       | `git push origin "refs/tags/<tag>"`                 | Plain tag push                             |
