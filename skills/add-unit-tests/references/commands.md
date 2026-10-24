# Commands

| Name          | Command                         | Purpose                                  |
| ------------- | ------------------------------- | ---------------------------------------- |
| `git-root`    | `git rev-parse --show-toplevel` | Project directory (preloaded in Context) |
| `list-files`  | `git ls-files`                  | List tracked files                       |
| `git-mv`      | `git mv <from> <to>`            | Relocate a test                          |
| `command-v`   | `command -v <tool>`             | Check a manager or runner binary exists  |
| `rm-artifact` | `rm -r <path>`                  | Remove one untracked coverage artifact   |

Coverage and test runs use the per-runner commands in `conventions.md` Coverage and `stacks.md`.
