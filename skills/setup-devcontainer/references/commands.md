# Commands

| Name                  | Command                                                                                                 | Purpose                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `repo-root`           | `git rev-parse --show-toplevel`                                                                         | Repository root (preloaded in Context)                                                   |
| `tool-probe`          | `command -v <tool>`                                                                                     | Check `devcontainer` or `docker` exists                                                  |
| `json-check`          | `node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' <devcontainer>`               | devcontainer.json parses as JSON                                                         |
| `read-configuration`  | `devcontainer read-configuration --workspace-folder <root> --config <devcontainer>`                     | CLI validates the config                                                                 |
| `compose-config`      | `docker compose -f <dev compose files…> config --quiet`                                                 | Compose files resolve                                                                    |
| `shellcheck-firewall` | `shellcheck <init-firewall.sh>`                                                                         | Lint the firewall script this skill wrote                                                |
| `devcontainer-up`     | `devcontainer up --workspace-folder <root> --config <devcontainer> --id-label cdk-test=<run id>`        | Test: build and start the container (permission-prompted)                                |
| `devcontainer-exec`   | `devcontainer exec --workspace-folder <root> --config <devcontainer> --id-label cdk-test=<run id> true` | Test: the started container runs a command                                               |
| `test-containers`     | `docker ps -aq --filter label=cdk-test=<run id>`                                                        | Ids of the test container(s) to remove                                                   |
| `test-remove`         | `docker rm -f <ids>`                                                                                    | Remove the test container (permission-prompted)                                          |
| `compose-down`        | `docker compose -f <dev compose files…> down`                                                           | Compose approach: remove the test project's containers and network (permission-prompted) |
