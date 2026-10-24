# Commands

| Name             | Command                                                     | Purpose                                              |
| ---------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| `root`           | `git rev-parse --show-toplevel`                             | Repo root (preloaded in Context)                     |
| `branch`         | `git rev-parse --abbrev-ref HEAD`                           | Current branch (preloaded in Context)                |
| `default-branch` | `git symbolic-ref --short refs/remotes/origin/HEAD`         | Origin default branch                                |
| `git-path`       | `git rev-parse --git-path <name>`                           | Path of a git state file (unsafe-state check)        |
| `scratch`        | `mktemp -d "${TMPDIR:-/tmp}/review-local-changes.XXXXXX"`   | Scratch dir for the temporary index and review files |
| `dirty-paths`    | `git status --porcelain=v1`                                 | Uncommitted paths (Dirty) before any fix             |
| `temp-index`     | `GIT_INDEX_FILE=<scratch>/index git read-tree HEAD`         | Seed the temporary index from HEAD                   |
| `temp-add`       | `GIT_INDEX_FILE=<scratch>/index git add -A`                 | Stage the working tree into the temporary index      |
| `temp-tree`      | `GIT_INDEX_FILE=<scratch>/index git write-tree`             | Write the snapshot tree                              |
| `snapshot`       | `git commit-tree <tree> -p HEAD --no-gpg-sign -m snapshot`  | Dangling snapshot commit (no ref, no signing)        |
| `ref-exists`     | `git rev-parse --verify --quiet refs/remotes/origin/<name>` | Whether `origin/<name>` exists (exit 0)              |
| `merge-base`     | `git merge-base origin/<default> HEAD`                      | Fork point from the default branch                   |
| `show-file`      | `git show <snapshot>:<file>`                                | File content at the snapshot (line-bound check)      |
| `diff-range`     | `git diff <base>..<snapshot>`                               | Full patch of the range                              |
| `name-status`    | `git diff --name-status <base>..<snapshot>`                 | Changed files                                        |
| `diff-numstat`   | `git diff --numstat <base>..<snapshot>`                     | Per-file line counts (Direct-review criteria)        |
| `range-log`      | `git log --oneline <base>..HEAD`                            | Unpushed commits                                     |
