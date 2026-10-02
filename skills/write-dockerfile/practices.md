# Dockerfile practices

Verified 2026-09-28 against docs.docker.com. Items marked **Required** always apply. Apply every other item that fits the app; skip one only with a reason in the Output.

## Structure

- First line `# syntax=docker/dockerfile:1`: BuildKit pulls the latest stable 1.x frontend, so heredocs, `--mount`, `COPY --link`, and build checks work without upgrading Docker. <https://docs.docker.com/reference/dockerfile/#syntax>
- **Required** multi-stage: at least one named build stage (`FROM … AS build`) and a runtime stage that gets only the artifacts via `COPY --from=build`. Interpreted apps too: install dependencies in a build stage, copy them into the runtime stage. BuildKit builds only the stages the target needs, in parallel where possible. <https://docs.docker.com/build/building/multi-stage/>
- Stage names lowercase; `AS` in the same case as `FROM` (checks `StageNameCasing`, `FromAsCasing`).
- **Required** base images pinned to an exact full version tag (`22.12.0-bookworm-slim`, never `22`, `lts`, or `latest`) plus its `sha256` digest. Tags are mutable; the digest makes the build reproducible, and the tag keeps it readable. Say digests need scheduled refresh (for example Renovate or Dependabot). <https://docs.docker.com/build/building/best-practices/#pin-base-image-versions>
- **Required** image path, tag, and digest as `ARG`s declared before the first `FROM`, one set per image, each with a default (check `InvalidDefaultArgInFrom`), so CI can override them with `--build-arg`:

  ```dockerfile
  ARG NODE_IMAGE=node
  ARG NODE_TAG=22.12.0-bookworm-slim
  ARG NODE_DIGEST=sha256:<digest>
  FROM ${NODE_IMAGE}:${NODE_TAG}@${NODE_DIGEST} AS build
  ```

  Digest lookup: `docker buildx imagetools inspect <image>:<tag> --format '{{json .Manifest.Digest}}'` (the multi-platform index digest). No docker and a Docker Hub image → `https://hub.docker.com/v2/namespaces/<namespace, library for official>/repositories/<repo>/tags/<tag>` field `digest`. Neither works → ask the user. Never guess a digest. <https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/>

- Prefer slim or distroless runtime images; keep compilers and dev dependencies in build stages.

## Packages

- **Required** never pin versions when installing system packages (`apt-get install -y --no-install-recommends curl`, `apk add --no-cache curl`, `dnf install -y curl`) or application packages outside the lockfile (`pip install gunicorn`, `npm install -g pnpm`, `gem install bundler`). Pinned package versions break the build once the repository drops them; the digest-pinned base image is the reproducibility anchor. Lockfile installs (`npm ci`, `pip install -r requirements.txt`, `uv sync --frozen`) keep the versions the lockfile records.
- hadolint flags unpinned installs, so run it with `--ignore DL3008 --ignore DL3013 --ignore DL3016 --ignore DL3018 --ignore DL3028 --ignore DL3033 --ignore DL3037 --ignore DL3041` (apt, pip, npm, apk, gem, yum, zypper, dnf pin rules). <https://github.com/hadolint/hadolint#rules>

## Cache

- Order layers from least to most often changed: system packages, then manifest + lockfile, then dependency install, then source, then build. A source edit then reuses the install layer. <https://docs.docker.com/build/cache/optimize/#order-your-layers>
- Image copies application files (user's choice, Clarify step) → `COPY` only the paths the build or runtime needs (manifest, lockfile, source dirs, config, build output), one `COPY` per group; never `COPY . .` or a whole directory with unrelated content. Unneeded files bloat the image, leak local files, and bust the cache on unrelated edits. Image does not copy application files → no application `COPY`; the app is mounted or supplied at run time. Multi-stage still applies: the build stage installs dependencies with bind mounts of the manifest and lockfile (no `COPY`), and the runtime stage gets only the installed dependencies via `COPY --from=build`; no dependencies either → the build stage prepares the runtime (user, system packages) and the runtime stage copies what it needs. <https://docs.docker.com/build/cache/optimize/#keep-the-context-small>
- Add `.dockerignore` (`.git`, `node_modules`, build output, `.env*`, logs, local tooling) to keep the context small and secrets out. Never ignore a file a `COPY` needs (check `CopyIgnoredFile`). <https://docs.docker.com/build/cache/optimize/#keep-the-context-small>
- Cache mounts for package managers (`RUN --mount=type=cache,target=<path>`); they persist between builds and never land in the image. Verified targets: npm `/root/.npm`, pip `/root/.cache/pip`, Go `/go/pkg/mod` + `/root/.cache/go-build`, Cargo `CARGO_HOME=/var/cache/cargo` + `/app/target/` (a cached dir is not in the layer, so copy the binary out in the same `RUN`, e.g. `cp target/release/app /usr/local/bin/`), Bundler `/root/.gem`, NuGet `/root/.nuget/packages`, Composer `/tmp/cache`. Other tools → take the path from the tool's official Docker docs; none found → no cache mount. <https://docs.docker.com/build/cache/optimize/#use-cache-mounts>
- apt with cache mounts: first `rm -f /etc/apt/apt.conf.d/docker-clean` and write `Binary::apt::APT::Keep-Downloaded-Packages "true";` to `/etc/apt/apt.conf.d/keep-cache`; mount `/var/cache/apt` and `/var/lib/apt`, both `sharing=locked` (apt needs exclusive access). <https://docs.docker.com/reference/dockerfile/#example-cache-apt-packages>
- apt without cache mounts: `apt-get update` and `apt-get install -y --no-install-recommends` in the same `RUN`, packages sorted alphabetically, end with `rm -rf /var/lib/apt/lists/*`. <https://docs.docker.com/build/building/best-practices/#apt-get>
- Bind mounts (`--mount=type=bind,source=<file>,target=<file>`) read manifests during install without a `COPY` layer; read-only by default. <https://docs.docker.com/reference/dockerfile/#run---mounttypebind>
- `COPY --link` for copies that do not depend on earlier layers (for example `COPY --link --from=build`), so the layer survives base-image changes. <https://docs.docker.com/reference/dockerfile/#copy---link>

## RUN

- Merge consecutive `RUN` instructions with the same cache inputs into one: fewer layers, and files created and deleted in one step never reach the image. Keep system packages, dependency install, and build as separate steps; merging them makes a source or lockfile edit rerun everything before it.
- Multi-line `RUN` → heredoc; start the body with `set -eux`. The default shell `/bin/sh -c` does not stop on a failing line without `set -e`, as the official examples show. A `RUN` with a secret mount → `set -eu`: `-x` prints expanded commands, secrets included, to the build log. <https://docs.docker.com/reference/dockerfile/#here-documents>

  ```dockerfile
  RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
      --mount=type=cache,target=/var/lib/apt,sharing=locked <<EOF
  set -eux
  apt-get update
  apt-get install -y --no-install-recommends ca-certificates curl
  EOF
  ```

- Quote the delimiter (`<<"EOF"`) to stop build-time variable expansion; a shebang (`#!/usr/bin/env bash`) picks another interpreter.
- Pipes: `set -o pipefail` (bash, or a shell that supports it), else a failing first command is ignored. <https://docs.docker.com/build/building/best-practices/#using-pipes>
- Absolute `WORKDIR`; never `RUN cd …` (check `WorkdirRelativePath`). <https://docs.docker.com/build/building/best-practices/#workdir>
- `COPY` for local files; `ADD` only for remote artifacts, with `--checksum=sha256:<sum>`. <https://docs.docker.com/build/building/best-practices/#add-or-copy>

## Secrets and config

- Secrets only via `RUN --mount=type=secret,id=<id>` (file at `/run/secrets/<id>`, or `env=<VAR>`), built with `--secret id=<id>,src=<file>`. Never `ARG` or `ENV`: they show in `docker history` (check `SecretsUsedInArgOrEnv`). <https://docs.docker.com/reference/dockerfile/#run---mounttypesecret>
- `ARG` for build-time values (not kept in the image); `ENV` for runtime values. Each `ENV` persists in its layer even if unset later. <https://docs.docker.com/build/building/best-practices/#env>
- `ENV`/`LABEL` in `key=value` form (check `LegacyKeyValueFormat`).
- `LABEL` with OCI keys the facts support, e.g. `org.opencontainers.image.source`, `org.opencontainers.image.licenses`, `org.opencontainers.image.authors`. Unknown value → leave the label out.

## Runtime

- Non-root user (user's choice, Clarify step) → create a system group and user with the same name, name and IDs from `ARG`s with the user's defaults, redeclared inside the stage that uses them (a global `ARG` is not visible after `FROM` otherwise). `COPY --chown=${APP_USER}:${APP_USER}` app files, then `USER ${APP_UID}:${APP_GID}` (numeric, so Kubernetes `runAsNonRoot` can verify it). No `sudo`. <https://docs.docker.com/build/building/best-practices/#user>

  ```dockerfile
  ARG APP_USER=app
  ARG APP_UID=10001
  ARG APP_GID=10001
  RUN <<EOF
  set -eux
  groupadd --system --gid "${APP_GID}" "${APP_USER}"
  useradd --system --uid "${APP_UID}" --gid "${APP_GID}" --no-create-home --shell /usr/sbin/nologin "${APP_USER}"
  EOF
  ```

  Alpine: `addgroup -S -g "${APP_GID}" "${APP_USER}"` and `adduser -S -D -H -u "${APP_UID}" -G "${APP_USER}" -s /sbin/nologin "${APP_USER}"`. Distroless (no shell) → create the user and group in a build stage, `COPY --from` its `/etc/passwd` and `/etc/group` into the runtime stage.

- `CMD` and `ENTRYPOINT` in exec form (`["node", "server.js"]`): shell form makes `/bin/sh` PID 1, so the app misses `SIGTERM` from `docker stop` (check `JSONArgsRecommended`). <https://docs.docker.com/reference/dockerfile/#entrypoint>
- `EXPOSE` the app's port; it documents, it does not publish. <https://docs.docker.com/reference/dockerfile/#expose>
- `HEALTHCHECK` only when the app has a health endpoint or command and the runtime image has the tool to call it; exit 0 healthy, 1 unhealthy. <https://docs.docker.com/reference/dockerfile/#healthcheck>

## Checks

- `docker build --check .` runs only the build checks; the `# syntax=docker/dockerfile:1` line pulls a frontend that supports them. `# check=error=true` turns warnings into errors. <https://docs.docker.com/build/checks/>
- `hadolint` with the Packages `--ignore` flags, only when installed and the file has no heredoc; hadolint cannot parse heredocs, and the heredoc rule makes most files heredoc files, so `docker build --check` is the primary check.
