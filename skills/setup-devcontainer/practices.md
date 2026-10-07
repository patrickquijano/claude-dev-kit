# Devcontainer practices

Verified 2026-10-06 against containers.dev, code.visualstudio.com, github.com/devcontainers, docs.docker.com, docs.github.com, and code.claude.com. Apply every item that fits the repo; skip one only with a reason in the Output.

## Location and format

- Config at `.devcontainer/devcontainer.json`; tools search it first, then `.devcontainer.json`, then `.devcontainer/<folder>/devcontainer.json` (one level deep only). Codespaces opens the first two by default. <https://containers.dev/implementors/spec/>
- devcontainer.json is JSONC; write plain JSON (valid JSONC) so `JSON.parse` can check it. Schema: <https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json>
- Commit `.devcontainer/`, so teammates get the reopen prompt. <https://code.visualstudio.com/docs/devcontainers/create-dev-container>

## Approach

- `image`: no extra system packages and no services; simplest. `build.dockerfile`: system packages or a custom build step; uses the Docker build cache. `dockerComposeFile` + `service`: one or more services. <https://code.visualstudio.com/docs/devcontainers/create-dev-container>
- Dockerfile needed = system packages, the firewall, or a custom build step. Derive: services selected → Compose (plus Dockerfile when needed: the `app` service builds it); else Dockerfile needed → Dockerfile; else image. An approach that drops a selection (image with packages, no Compose with services) is never offered.
- Repo already has a compose file → extend it, never edit it: `"dockerComposeFile": ["../compose.yaml", "compose.yaml"]`; the dev file only overrides and adds services. <https://code.visualstudio.com/docs/devcontainers/create-dev-container#_extend-your-docker-compose-file-for-development>
- Compose resolves every path in every file relative to the base (first) file. Extending the repo file at the root → paths in `.devcontainer/compose.yaml` are relative to the root: workspace volume `..:/workspaces:cached`, `env_file: .devcontainer/.env`, `build.context: .devcontainer`. <https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/>

## Images

- Base image `mcr.microsoft.com/devcontainers/<image>`. Stack → image: Node with `tsconfig.json` → `typescript-node`, other Node → `javascript-node`, Python → `python`, Go → `go`, Java → `java`, .NET → `dotnet`, PHP → `php`, Rust → `rust`, Ruby → `ruby`, C/C++ → `cpp`, none or other → `base`. <https://github.com/devcontainers/images>
- Tag `<image major>-<runtime version>-<debian codename>` (e.g. `1-3.12-bookworm`): the image major tag keeps getting security patches, which only land on the latest non-breaking versions, and the codename pins the OS. Pick from `https://mcr.microsoft.com/v2/devcontainers/<image>/tags/list`: highest image major, the runtime version the repo pins, the newest Debian codename listed for it (Debian variants work on arm64). Never guess a tag. <https://github.com/devcontainers/images/tree/main/src/python>
- Dockerfile base → the highest full semver tag of that line instead (e.g. `3.2.3-3.12-bookworm`), since `cdk:write-dockerfile` pins an exact tag plus digest; say the digest needs scheduled refresh (Renovate or Dependabot).
- Images set their non-root user (`vscode` in base images, `node` in `javascript-node` and `typescript-node`) through image metadata, so omit `remoteUser`; read the user from the image README at `https://raw.githubusercontent.com/devcontainers/images/main/src/<image>/README.md` when a path needs its home.
- Monorepo with several stacks → one root config: base image of the primary stack (most source files), other runtimes as features.

## Features

- `ghcr.io/devcontainers/features/<id>:<major>`; major = first number of `version` in `https://raw.githubusercontent.com/devcontainers/features/main/src/<id>/devcontainer-feature.json`. <https://github.com/devcontainers/features>
- Runtimes for extra stacks: `node`, `python`, `go`, `java`, `dotnet`, `php`, `rust`, `ruby`. Tools only on repo evidence: `github-cli` (GitHub remote), `git-lfs` (`filter=lfs` in `.gitattributes`), `terraform` (`*.tf`), `kubectl-helm-minikube` (Helm charts or Kubernetes manifests), `aws-cli` / `azure-cli` (their SDK or config in the repo).
- Docker access (user's choice): `docker-outside-of-docker` reuses the host daemon, which is host-level access; bind mounts of workspace paths need `"remoteEnv": {"LOCAL_WORKSPACE_FOLDER": "${localWorkspaceFolder}"}`. `docker-in-docker` runs the container with `privileged: true`. <https://github.com/devcontainers/features/tree/main/src/docker-outside-of-docker>
- `devcontainer-lock.json` sits next to devcontainer.json and records each feature's resolved digest; `devcontainer build` and `up` write it; commit it, `--frozen-lockfile` enforces it. <https://github.com/devcontainers/spec/blob/main/docs/specs/devcontainer-lockfile.md>

## Services (Compose)

Catalog, each image on Docker Hub (`library` = official image):

| Service       | Image                          |
| ------------- | ------------------------------ |
| PostgreSQL    | `library/postgres`             |
| MySQL         | `library/mysql`                |
| MariaDB       | `library/mariadb`              |
| MongoDB       | `library/mongo`                |
| Redis         | `library/redis`                |
| Valkey        | `valkey/valkey`                |
| RabbitMQ      | `library/rabbitmq`             |
| Kafka         | `apache/kafka`                 |
| OpenSearch    | `opensearchproject/opensearch` |
| Elasticsearch | `library/elasticsearch`        |
| Mailpit       | `axllent/mailpit`              |
| LocalStack    | `localstack/localstack`        |

- Per service, read `full_description` of `https://hub.docker.com/v2/repositories/<namespace>/<repo>/` for its port, data directory, required env vars, and health command. Not documented there → no healthcheck, and `depends_on` uses `condition: service_started`. Never invent a health command or a data path (PostgreSQL 18 changed its data path, for example).
- Tag: highest semver stable release tag (never the first by date, since an older line's patch can be newer) from `https://hub.docker.com/v2/namespaces/<namespace>/repositories/<repo>/tags?page_size=100&ordering=last_updated`; never `latest`, never a prerelease. Compose images are not in the lockfile, so the exact tag is the pin.
- Layout, as the official templates do: `app` service (the devcontainer) with `volumes: ["../..:/workspaces:cached"]` and `command: sleep infinity`; each service with `restart: unless-stopped`, a named volume at its data directory, and a `healthcheck`; `app` `depends_on` each service with `condition: service_healthy` when it has a healthcheck. devcontainer.json sets `service: "app"` and `workspaceFolder: "/workspaces/${localWorkspaceFolderBasename}"`. Services reach each other by service name on the Compose default network. <https://github.com/devcontainers/templates/tree/main/src/javascript-node-postgres>, <https://docs.docker.com/reference/compose-file/services/>
- Never use Compose `ports`; they do not forward from Codespaces. Forward with `forwardPorts`, `"<service>:<port>"` for a service port. <https://containers.dev/implementors/json_reference/>
- Credentials: `env_file: .env` on each service (paths per the base-file rule in `## Approach`); commit `.devcontainer/.env.example` with every key and `change-me` values; write `.devcontainer/.env` as a copy and add `.devcontainer/.env` to `.gitignore`. Repo rule: never commit credentials. App connection vars (e.g. `DATABASE_URL`) only when the repo reads them.

## Lifecycle and environment

- Order: `initializeCommand` (host) → `onCreateCommand` → `updateContentCommand` → `postCreateCommand` → `postStartCommand` → `postAttachCommand`; a failing one stops the rest. Prebuilds cache the first three without user secrets, so anything needing secrets goes in `postCreateCommand`. Object form runs entries in parallel. <https://containers.dev/implementors/json_reference/#lifecycle-scripts>
- Dependency install from the lockfile (`npm ci`, `uv sync --frozen`, `composer install`, …) in `postCreateCommand`; several package managers → object form, one entry each.
- `containerEnv` is fixed at build (rebuild to change); `remoteEnv` applies to tools only and can reference `${containerEnv:PATH}`. Host values via `${localEnv:VAR}`; never hard-code a secret. Codespaces secrets the repo needs → `secrets` with `description`. <https://code.visualstudio.com/remote/advancedcontainers/environment-variables>, <https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/configuring-dev-containers/specifying-recommended-secrets-for-a-repository>
- `forwardPorts` for the app's ports; `appPort` is legacy.
- Never mount `~/.ssh` or cloud credential files; pass credentials through `${localEnv:VAR}`, Codespaces secrets, or workload identity. <https://code.claude.com/docs/en/devcontainer>

## Performance

- Bind mounts are slow on macOS and Windows. Node repo → named volume for `node_modules`: `"source=${localWorkspaceFolderBasename}-node_modules,target=${containerWorkspaceFolder}/node_modules,type=volume"` in `mounts` (Compose: a named volume on `app`), and prefix `postCreateCommand` with `sudo chown <user> node_modules` so the non-root user can write it. <https://code.visualstudio.com/remote/advancedcontainers/improve-performance>
- No `eol=` rule in `.gitattributes` → append `* text=auto eol=lf`, so Windows checkouts do not break scripts in the Linux container. <https://code.visualstudio.com/docs/devcontainers/tips-and-tricks#_resolving-git-line-ending-issues-in-containers-resulting-in-many-modified-files>
- `customizations.vscode.extensions` only for linters and formatters the repo configures, each ID confirmed at `https://marketplace.visualstudio.com/items?itemName=<id>`; unconfirmed → omit.

## Claude Code

Source: <https://code.claude.com/docs/en/devcontainer>.

- Feature `ghcr.io/anthropics/devcontainer-features/claude-code:1` (the docs show `1.0`; the registry publishes `1`, so the `:<major>` rule holds); it installs Node itself. "Failed to install Node.js and npm" → add `ghcr.io/devcontainers/features/node:<major>` above it.
- Sign-in survives rebuilds: mount `source=claude-code-config-${devcontainerId},target=<user home>/.claude,type=volume` and set `containerEnv.CLAUDE_CONFIG_DIR` to the same path (`~/.claude.json` lives outside `~/.claude` otherwise).
- Codespaces clears `~/.claude` on rebuild → declare `secrets` `ANTHROPIC_API_KEY` and `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`), each with a description.
- Firewall (opt-in): fetch `init-firewall.sh`, `Dockerfile`, and `devcontainer.json` from `https://raw.githubusercontent.com/anthropics/claude-code/main/.devcontainer/`. Copy the script to `.devcontainer/init-firewall.sh`. From that Dockerfile take only the packages the script calls (not its shell or Node toolchain) and its sudoers line, with the user replaced by the base image's user. Set `"capAdd": ["NET_ADMIN", "NET_RAW"]` (cross-orchestrator, so it also reaches the Compose `app`; `runArgs`, which the reference uses, applies to image and Dockerfile configs only), and `postStartCommand` and `waitFor` as that devcontainer.json does. <https://containers.dev/implementors/json_reference/> Needs a Dockerfile. The allowlist blocks registries it does not list, so installs after `postStartCommand` fail until their domains are added.
- Warn in the Output: a devcontainer does not stop a malicious project from exfiltrating what the container can reach, Claude credentials included; use it only with trusted repositories.

## Dockerfile handoff

Arguments for `cdk:write-dockerfile`, space-separated `key=value`, values with spaces in double quotes:

- `target=devcontainer dir=.devcontainer context=.devcontainer`.
- `base=mcr.microsoft.com/devcontainers/<image>:<full semver tag>`.
- `packages=<a,b,…>`: comma-separated system packages (repo needs plus firewall packages); none → omit.
- `sudoers="<line>"`: firewall only.
- `copy=<src>:<dest>,…`: files from the context to copy in as root and make executable, e.g. `copy=init-firewall.sh:/usr/local/bin/init-firewall.sh`; none → omit.
- devcontainer.json `"build": {"dockerfile": "Dockerfile", "context": "."}` (relative to `.devcontainer/`); Compose `app` `build: {context: ., dockerfile: Dockerfile}` when `.devcontainer/compose.yaml` is the base file, `build: {context: .devcontainer, dockerfile: Dockerfile}` when it extends the repo's root compose file.

## Checks

- `node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' <devcontainer.json>`.
- `devcontainer read-configuration --workspace-folder <root> --config <devcontainer.json>` when `@devcontainers/cli` is installed (`npm install -g @devcontainers/cli`). <https://github.com/devcontainers/cli>
- Compose → `docker compose -f <dev compose files…> config --quiet` when docker is installed.
- `devcontainer up --workspace-folder <root>` pulls images and runs lifecycle commands → only when the user asks.
