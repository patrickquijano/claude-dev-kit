# Practices

Sources are Docker docs unless noted. **Required** = always applied for the mode; **Recommended** = applied when it fits, else skipped with a reason. `dclint` rule names are from <https://github.com/zavoloklom/docker-compose-linter/blob/main/docs/rules.md>.

## Contents

- Mode signals · File names · Long syntax · Defaults · Image tags · Plain Compose · Swarm stack · Swarm lint triage · Gaps

## Mode signals

Strong Swarm signals: `docker stack` in the input; `swarm-state` prints `active`; `deploy:` with `replicas`, `placement`, `update_config`, or `rollback_config`; external `secrets` or `configs`; an `overlay` network. `deploy:` alone, or only resource limits, is not Swarm: the section is ignored where it is not implemented and the file stays valid (<https://docs.docker.com/reference/compose-file/services/>). `swarm-state` prints `inactive` outside a swarm (verified locally; the active value is the `LocalNodeState` field).

## File names

- **Required** base file `compose.yaml`; a scoped or environment file `compose.<scope-or-environment>.yaml` (`compose.prod.yaml`, `compose.swarm.yaml`), the name asked. Never create `docker-compose.yml`, `docker-compose.yaml`, or any `.yml` file. `compose.yaml` is the preferred name and wins if both exist (<https://docs.docker.com/compose/intro/compose-application-model/>).
- **Recommended** `compose.swarm.yaml` for a Swarm file: our convention, no official name exists; `-c` takes any path (<https://docs.docker.com/reference/cli/docker/stack/deploy/>).

## Long syntax

- **Required** every service entry below is a mapping, never the short string or list form; a short entry in an existing file is converted with the same meaning (<https://docs.docker.com/reference/compose-file/services/>):
  - `ports`: `target`, plus `published` when published, `host_ip` when bound to an interface.
  - `volumes`: `type`, `source`, `target`; `read_only` only when `true`.
  - `secrets` and `configs`: `source`; `target`, `uid`, `gid`, `mode` only when set.
  - `depends_on`: per service a `condition`, which the long form requires; `required` and `restart` only when non-default.
  - `env_file`: list items of `path`; `required` only when `false`.
  - `networks`: a mapping per network, `{}` when it has no attributes; `aliases` and similar only when asked.
  - `build`: a mapping with `context`; `dockerfile` and `args` only when stated.
- **Required** top-level `volumes`, `networks`, `secrets`, and `configs` entries carry only non-default attributes; an entry with none is written `<name>: {}`.

## Defaults

- **Required** never write a key whose value equals its documented default; a key the syntax requires (`type`, `target`, `condition`) stays (<https://docs.docker.com/reference/compose-file/services/>, <https://docs.docker.com/reference/compose-file/deploy/>, <https://docs.docker.com/reference/compose-file/networks/>).
- **Required** confirmed defaults, omitted when equal: `restart: no`; port `protocol: tcp`; Swarm port `mode: ingress`; `read_only: false`; `depends_on` `required: true`, `restart: false`; `env_file` `required: true`; `internal: false`; `attachable: false`; `external: false`; `healthcheck` `interval: 30s`, `timeout: 30s`, `retries: 3`, `start_period: 0s`; Swarm `replicas: 1`, `update_config` `order: stop-first` and `failure_action: pause`; secret `target: /run/secrets/<source>`.
- **Required** a default not listed here and not confirmed on the reference pages → keep the key as stated and list it under `Open:`; never judge it from memory.

## Image tags

- **Required** every `image:` pinned to the most specific tag: `<X.Y.Z>` or `<X.Y.Z>-<variant>`; never `latest`, `stable`, a major or `major.minor` tag, a bare variant such as `-alpine`, or no tag. `dclint` rule `service-image-require-explicit-tag` rejects `latest`, `stable`, and no tag. Format `[registry/][project/]image[:tag|@digest]` (<https://docs.docker.com/reference/compose-file/services/>).
- **Required** resolve the tag at run time, Docker Hub images only, never from memory (<https://docs.docker.com/reference/api/hub/latest/operations/ListRepositoryTags/>):
  - List `https://hub.docker.com/v2/namespaces/<namespace; library for official>/repositories/<repo>/tags?page_size=100&name=<major.minor>` with WebFetch (the endpoint answered in a local test).
  - Page through `next` until null, at most 10 pages; cap reached with no match → ask the user.
  - Keep tags matching `^\d+\.\d+\.\d+(-<variant>)?$`; an image that publishes only `X.Y` tags (no `X.Y.Z` form in the listing) → use the highest `^\d+\.\d+(-<variant>)?$` tag, the most specific one it offers. This drops `latest`, `stable`, short tags, and `-rc`, `-beta`, `-alpha` forms. The variant matches the image the app needs (default: none, else the repo's slim form).
  - Take the highest by numeric major, minor, patch comparison, not by `last_updated`; the API documents no sort order.
  - A tag already in an existing file that matches the pattern stays; resolve only new or non-exact ones.
- **Required** another registry, a failed lookup, or an unverifiable version → ask the user (recommended: the tag they name); never fall back to a remembered tag.
- **Recommended** `docker compose config --resolve-image-digests` exists to lock digests; this skill pins tags, not digests.

## Plain Compose

- **Required** no top-level `version:`; it is obsolete and Compose warns (<https://docs.docker.com/reference/compose-file/version-and-name/>); `dclint` rule `no-version-field`.
- **Required** `depends_on` conditions only `service_started`, `service_healthy`, or `service_completed_successfully`; `service_healthy` needs a `healthcheck` on the dependency (<https://docs.docker.com/reference/compose-file/services/>).
- **Required** `healthcheck.test` starts with `NONE`, `CMD`, or `CMD-SHELL`; a string means `CMD-SHELL` (same page).
- **Required** secrets defined in top-level `secrets` and granted per service in the long syntax; the mount defaults to `/run/secrets/<source>` (same page).
- **Required** `container_name` only when needed: it caps the service at one container and must match `[a-zA-Z0-9][a-zA-Z0-9_.-]+` (same page).
- **Required** with both `mem_limit` and `deploy.resources.limits.memory`, the values agree; set one (same page).
- **Required** an `external: true` network or volume carries no attribute but `name` (<https://docs.docker.com/reference/compose-file/networks/>, <https://docs.docker.com/reference/compose-file/volumes/>).
- **Required** no `build` and `image` together unless the image is the build tag (`dclint` rule `no-build-and-image`).
- **Recommended** top-level `name:` for the project name (`dclint` rule `require-project-name-field`).
- **Recommended** service, network, and volume keys lowercase, hyphen or underscore separated, named for the role (`api`, `db`, `cache`). No official naming convention exists; the `container_name` pattern above is the only documented constraint.
- **Recommended** `restart: unless-stopped` for long-running services, `on-failure[:n]` for jobs; the default is `no`, never written (<https://docs.docker.com/reference/compose-file/services/>).
- **Recommended** a `healthcheck` on every service something depends on, with only the `interval`, `timeout`, `retries`, and `start_period` values that differ from the defaults (<https://docs.docker.com/reference/compose-file/services/>).
- **Recommended** secrets: `file:` secrets and the `_FILE` variable convention the official postgres and mysql images support; no sensitive data in environment variables; secrets are Linux containers only (<https://docs.docker.com/compose/how-tos/use-secrets/>, <https://docs.docker.com/compose/how-tos/environment-variables/best-practices/>).
- **Recommended** env handling: `env_file` paths relative to the compose file, the last file wins, `environment` overrides `env_file`, `required: false` skips a missing file (<https://docs.docker.com/reference/compose-file/services/>); `${VAR:?err}` for mandatory values, `${VAR:-default}` for defaults, `$$` for a literal `$` (<https://docs.docker.com/reference/compose-file/interpolation/>); separate `.env` per environment.
- **Recommended** networks: a dedicated named network per trust boundary; `internal: true` isolates a network from outside connectivity; with no declaration Compose creates an implicit `default` network (<https://docs.docker.com/reference/compose-file/networks/>).
- **Recommended** volumes: a top-level named volume for persistent data, granted per service; a bind mount only for a host path the app must see. Compose creates a missing named volume on `up`; the docs give no general named-versus-bind rule, so this is our default (<https://docs.docker.com/reference/compose-file/volumes/>).
- **Recommended** resource limits: `deploy.resources.limits` (`cpus`, `memory`) or `mem_limit`; ask the values, never invent them (<https://docs.docker.com/reference/compose-file/services/>).
- **Recommended** `profiles` for optional services; a service without a profile always starts (<https://docs.docker.com/reference/compose-file/services/>).
- **Recommended** hardening where the image allows: `init: true`, `read_only: true`, `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]` (same page).
- **Recommended** bind published ports to an interface with long syntax (`published: 8080`, `target: 80`, `host_ip: 127.0.0.1`) unless public exposure is intended (`dclint` rule `no-unbound-port-interfaces`).

## Swarm stack

Deploy command: `docker stack deploy -c <file> <stack>` from a manager; repeat `-c` to merge a base file and overrides; `--with-registry-auth` for private registries; the deploy is detached by default (<https://docs.docker.com/reference/cli/docker/stack/deploy/>).

- **Required** images come from a registry; `build:` is ignored ("Ignoring unsupported options: build"), so build, tag with the registry address, and push first (<https://docs.docker.com/engine/swarm/stack-deploy/>).
- **Required** no top-level `name:`: `docker stack config` rejects it (`additional property 'name' is not allowed`, verified locally); the stack name comes from the deploy command and prefixes service, network, and volume names (<https://docs.docker.com/reference/cli/docker/stack/deploy/>).
- **Required** no top-level `version:`; the field is obsolete (<https://docs.docker.com/reference/compose-file/version-and-name/>), and a Swarm file without it passed `docker stack config` in a local test.
- **Required** no `extends` and no `links` (`extends` is unsupported under `stack deploy`; `links` prints "Ignoring unsupported options: links") (<https://docs.docker.com/reference/compose-file/services/>, <https://docs.docker.com/reference/cli/docker/stack/deploy/>).
- **Required** secrets: `file:` or `external: true`; secrets sourced from `environment` are not supported by `stack deploy` (<https://docs.docker.com/reference/compose-file/secrets/>).
- **Required** `deploy` keys limited to `replicas`, `placement` (`constraints`, `preferences`), `update_config` and `rollback_config` (`parallelism`, `delay`, `failure_action`, `order`, `monitor`, `max_failure_ratio`), `restart_policy` (`condition` of `none`, `on-failure`, or `any`; `delay`, `max_attempts`, `window`), `resources` (`limits`, `reservations`), `endpoint_mode`, `labels`, `mode` (<https://docs.docker.com/reference/compose-file/deploy/>).
- **Required** `rollback_config.failure_action` is `continue` or `pause`; `update_config.failure_action` may also be `rollback` (same page).
- **Required** an unset `restart_policy` falls back to the service `restart` field; set `deploy.restart_policy` instead (same page).
- **Required** long-syntax port `mode` is `ingress` (default, load-balanced) or `host` (published on every node) (<https://docs.docker.com/reference/compose-file/services/>).
- **Required** the stack file name follows File names; services are named for the role and keep their short names, since the stack name is the prefix (<https://docs.docker.com/reference/cli/docker/stack/deploy/>; naming itself is our convention, no official one exists).
- **Required** env handling: `${VAR:?err}` for mandatory values and `${VAR:-default}` for defaults, `$$` for a literal `$` (<https://docs.docker.com/reference/compose-file/interpolation/>); `docker stack config --skip-interpolation` only when piping its output to `stack deploy`, so `$${1}` is not interpolated twice (<https://docs.docker.com/reference/cli/docker/stack/config/>); no secret values in `environment` (see the secrets item).
- **Recommended** `update_config: {order: start-first, failure_action: rollback}` plus a `rollback_config`; the defaults are `stop-first` and `pause`. This is our recommendation, the docs give options and defaults only.
- **Recommended** `overlay` networks; `attachable: true` only when standalone containers must join (<https://docs.docker.com/reference/compose-file/networks/>).
- **Recommended** `external` secrets and configs created beforehand with the Docker CLI (<https://docs.docker.com/reference/compose-file/secrets/>).
- **Recommended** a `healthcheck` per service so rolling updates wait for readiness; `deploy.resources.limits` and `reservations` for every service; the healthcheck and resource keys are documented at <https://docs.docker.com/reference/compose-file/services/> and <https://docs.docker.com/reference/compose-file/deploy/>.
- **Recommended** keep the file conservative: the stack-deploy tutorial says it uses the older Compose file format and the latest specification is not fully compatible (<https://docs.docker.com/engine/swarm/stack-deploy/>).
- **Recommended** pin a stateful service to a node with `placement.constraints` when it uses a local named volume (our recommendation: a local volume lives on one node); a bind mount with a relative host path is rejected on non-local platforms (<https://docs.docker.com/reference/compose-file/services/>, <https://docs.docker.com/reference/compose-file/deploy/>).

## Swarm lint triage

`dclint` has no Swarm mode (unconfirmed: its docs and rules page name none; schema validation always runs and cannot be disabled). In Swarm mode run it with `--disable-rule` for each rule that contradicts a Required Swarm item above, and list each disabled rule under `Skipped practices:` with its reason:

- `require-project-name-field`: a Swarm file has no top-level `name:` (verified: `docker stack config` rejects it).
- `no-unbound-port-interfaces`: `ingress` publishes on every node; whether `stack deploy` honors a host IP is not confirmed, so the rule is disabled and the choice is reported.

A schema finding on a key the Required items allow (for example `deploy`) → report it under `Open:`, never remove the key to silence `dclint`. Errors exit nonzero, warnings fail only past `--max-warnings` (<https://github.com/zavoloklom/docker-compose-linter/blob/main/docs/cli.md>).

## Gaps

- The full list of keys `docker stack deploy` ignores is not documented in the pages read: only `build`, `links`, and `extends` are confirmed. `depends_on`, `container_name`, and `restart` are not stated for Swarm; do not claim they are ignored, and prefer the Swarm-native form (`deploy.restart_policy`, no `container_name`).
- The minimum Docker version for `docker stack config` is not stated in its docs.
- Exact `dclint` exit-code numbers and `--fix` coverage are not documented; the auto-fixable count appears in its output.
