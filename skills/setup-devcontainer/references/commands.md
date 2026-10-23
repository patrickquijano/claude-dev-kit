# Commands

| Name                 | Command                                                                                   | Purpose                                 |
| -------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------- |
| `repo-root`          | `git rev-parse --show-toplevel`                                                           | Repository root (preloaded in Context)  |
| `tool-probe`         | `command -v <tool>`                                                                       | Check `devcontainer` or `docker` exists |
| `json-check`         | `node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' <devcontainer>` | devcontainer.json parses as JSON        |
| `read-configuration` | `devcontainer read-configuration --workspace-folder <root> --config <devcontainer>`       | CLI validates the config                |
| `compose-config`     | `docker compose -f <dev compose files…> config --quiet`                                   | Compose files resolve                   |
| `devcontainer-up`    | `devcontainer up --workspace-folder <root>`                                               | Start the container, only on request    |
