# Commands

| Name         | Command                         | Purpose                                                                              |
| ------------ | ------------------------------- | ------------------------------------------------------------------------------------ |
| `git-root`   | `git rev-parse --show-toplevel` | Project directory (preloaded in Context)                                             |
| `list-files` | `git ls-files`                  | List tracked files                                                                   |
| `git-dir`    | `git rev-parse --git-dir`       | Locate the git dir for the unsafe-state check                                        |
| `app-stop`   | `kill <pid>`                    | Stop the app process this run started (PID recorded at start; never another process) |
