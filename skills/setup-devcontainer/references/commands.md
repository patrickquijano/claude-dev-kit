# Commands

| Name | Command | Purpose |
| --- | --- | --- |
| `repo-root` | `git rev-parse --show-toplevel` | Repository root (preloaded in Context) |
| `tool-probe` | `command -v <tool>` | Check `devcontainer`, `docker`, `shellcheck`, `code`, or `node` exists |
| `node-probe` | `node --version` | Node available; run before `json-check` and `pick-tag` |
| `pick-tag` | `node ${CLAUDE_SKILL_DIR}/scripts/pick-tag.mjs --image <image> --mode <image\|dockerfile> [--runtime <version>]` | JSON `{ok, tag, source}`: newest stable MCR tag per practices.md `## Images`; `ok` false → the `## Images` WebFetch pick |
| `pick-tag-hub` | `node ${CLAUDE_SKILL_DIR}/scripts/pick-tag.mjs --mode hub < <tags-file>` | JSON `{ok, tag}`: highest stable semver tag from Docker Hub tag names read from `<tags-file>`, a session scratch file outside the repo that the Write tool wrote (a JSON array of names, or `{results:[{name}]}`); `ok` false → WebFetch pick |
| `ext-list` | `code --list-extensions` | Host VS Code extension ids, read as data |
| `run-id` | `date +%s` | Epoch seconds; the run id is `cdk-<seconds>`, used once for the whole test |
| `json-check` | `node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' <devcontainer>` | devcontainer.json parses as JSON |
| `read-configuration` | `devcontainer read-configuration --workspace-folder <root> --config <devcontainer>` | CLI validates the config |
| `compose-config` | `docker compose -f <dev compose files…> config --quiet` | Compose files resolve (not in allowed-tools, so the permission prompt approves it) |
| `shellcheck-firewall` | `shellcheck <init-firewall.sh>` | Lint the firewall script this skill wrote |
| `devcontainer-up` | `COMPOSE_PROJECT_NAME=<run id> devcontainer up --workspace-folder <root> --config <devcontainer> --id-label cdk-test=<run id>` | Test: build and start the container (permission-prompted) |
| `devcontainer-exec` | `devcontainer exec --workspace-folder <root> --config <devcontainer> --id-label cdk-test=<run id> true` | Test: the started container runs a command |
| `test-containers` | `docker ps -aq --filter label=cdk-test=<run id>` | Ids of the test container(s) to remove |
| `test-remove` | `docker rm -f <ids>` | Remove the test container (permission-prompted) |
| `compose-down` | `docker compose -p <run id> -f <dev compose files…> down` | Compose approach: remove the test project's containers and network; `-v` is left out because it would also remove a pre-existing volume with an explicit `name:`, which the run id does not scope (permission-prompted) |
| `test-volumes` | `docker volume ls -q --filter label=com.docker.compose.project=<run id>` | Compose approach: ids of the volumes this test project created, found by the project label |
| `test-volume-remove` | `docker volume rm <ids>` | Compose approach: remove the test project's volumes (permission-prompted) |
