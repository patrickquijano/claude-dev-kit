# Commands

| Name              | Command                                    | Purpose                                |
| ----------------- | ------------------------------------------ | -------------------------------------- |
| `repo-root`       | `git rev-parse --show-toplevel`            | Repository root (preloaded in Context) |
| `tracked-files`   | `git ls-files`                             | Tracked files                          |
| `untracked-files` | `git ls-files --others --exclude-standard` | Untracked, not ignored                 |
| `tool-check`      | `command -v <tool>`                        | Tool installed                         |
| `ec-version`      | `ec -version`                              | Identify the `ec` binary               |
| `checker`         | `editorconfig-checker`                     | Check files against config             |
| `checker-ec`      | `ec`                                       | Same checker, short name               |
