# Commands

| Name           | Command                                              | Purpose                                                                                 |
| -------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `git-root`     | `git rev-parse --show-toplevel`                      | Project directory (preloaded in Context)                                                |
| `list-files`   | `git ls-files`                                       | List tracked files                                                                      |
| `docker-info`  | `docker info`                                        | Check Docker is available                                                               |
| `git-dir`      | `git rev-parse --git-dir`                            | Locate the git dir for the unsafe-state check                                           |
| `compose-up`   | `docker compose -f <file> -p <project> up -d --wait` | Start the test services of a compose file this run wrote, under project `<project>`     |
| `compose-down` | `docker compose -f <file> -p <project> down -v`      | Remove the test services and volumes this run started; same `<project>` as `compose-up` |
