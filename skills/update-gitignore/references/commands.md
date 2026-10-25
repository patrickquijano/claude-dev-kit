# Commands

| Name             | Command                                                          | Purpose                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `repo-root`      | `git rev-parse --show-toplevel`                                  | Repo root; preloaded in Context.                                                                                                            |
| `tracked-files`  | `git ls-files`                                                   | Tracked files; inline fallback of step 2.                                                                                                   |
| `untracked-dirs` | `git ls-files --others --exclude-standard --directory`           | Untracked, not ignored; inline fallback of step 2.                                                                                          |
| `ignored-dirs`   | `git ls-files --others --ignored --exclude-standard --directory` | Ignored paths; inline fallback of step 2.                                                                                                   |
| `check-ignore`   | `git check-ignore -v <path>...`                                  | Shows which rule ignores each path; paths are repo-relative to the root, never a leading `/` pattern; exit 1 when none is, which is a miss. |
