# Dockerfile practices

Sourced from docs.docker.com, except the `Packages` pins, apt list cleanup, and hadolint rule ids (DL3009, DL3042, DL3019, DL3059; DL3005 only flags `dist-upgrade`), sourced from docs.docker.com and github.com/hadolint/hadolint; `Structure` base and tool-stage rules and `Packages` update, upgrade, and cleanup are cdk policy, not Docker guidance; `## Devcontainer target` sourced from containers.dev and github.com/devcontainers. Items marked **Required** always apply. Apply every other item that fits the app; skip one only with a reason in the Output.

## Contents

- Structure · Packages · Cache · RUN · Secrets and config · Runtime · Devcontainer target · Checks

## Structure

- First line `# syntax=docker/dockerfile:1`: BuildKit pulls the latest stable 1.x frontend, so heredocs, `--mount`, `COPY --link`, and build checks work without upgrading Docker. <https://docs.docker.com/reference/dockerfile/#syntax>
- Second line `# check=error=true`: a build check violation fails the build instead of warning; parser directives sit before any other instruction. An existing `# check=` line keeps its `skip=` ids, with `error=true` added (`# check=skip=<ids>;error=true`). <https://docs.docker.com/build/checks/>
- **Required** multi-stage: at least one named build stage (`FROM … AS build`) and a runtime stage that gets only the artifacts via `COPY --from=build`. Interpreted apps too: install dependencies in a build stage, copy them into the runtime stage. BuildKit builds only the stages the target needs, in parallel where possible. <https://docs.docker.com/build/building/multi-stage/>
- Stage names lowercase; `AS` in the same case as `FROM` (checks `StageNameCasing`, `FromAsCasing`).
- **Required** distribution preference Debian, then Ubuntu, then Alpine: the first one the runtime's official image supports (and that the app's system packages and native dependencies work on; musl on Alpine breaks glibc-only binaries), in its slim variant when one exists and is compatible (Debian `slim`; Ubuntu and Alpine are already minimal). Debian is the default (glibc, broad package support).
- **Required** base images pinned to an exact full version tag (`<X.Y.Z>-<variant>`; never `<major>`, `lts`, `stable`, `latest`, or a bare distro alias like `-alpine` or `-slim`, which float), with no digest. Variant = the repo's own slim form of the chosen distro, spelled as the repo lists it: Debian `<codename>-slim` or `slim-<codename>`, Alpine `alpine<A.B>`, Ubuntu `<codename>` (or `<YYYY.MM>` for the `ubuntu` image itself, newest LTS). Resolve the tag at run time, Docker Hub images only, with `resolve-tag` (`--image <namespace/repo, or repo for official>`, `--runtime <major.minor>`, `--variant <the newest codename, release, or Alpine version the registry lists for the chosen distro>`; `ubuntu` image: `--variant ubuntu`, no runtime); it pages the tags API at most 10 pages, keeps only exact stable tags, and takes the highest by numeric semver. Cap reached with no match, `ok: false`, another registry, or an unverifiable version → ask the user; never guess or fall back to an older remembered tag. Update mode keeps an existing valid exact tag and resolves only new or non-exact ones; it removes every `@sha256:` digest and `*_DIGEST` `ARG` it finds. <https://docs.docker.com/build/building/best-practices/#pin-base-image-versions>
- **Required** image path and tag as `ARG`s declared before the first `FROM`, one pair per image, each with a default (check `InvalidDefaultArgInFrom`), so CI can override them with `--build-arg`. Every `ARG` in the file has a default value; never a bare `ARG NAME`:

  ```dockerfile
  ARG NODE_IMAGE=node
  ARG NODE_TAG=<X.Y.Z>-<variant>
  FROM ${NODE_IMAGE}:${NODE_TAG} AS build
  ```

- **Required** tool from an official or trusted image instead of installing it (trusted = Docker Official Image, Docker Verified Publisher, or the tool vendor's own image, e.g. `ghcr.io/astral-sh/uv`, `docker`, `node`, a `tini` or `busybox` image): add a stage `FROM ${<TOOL>_IMAGE}:${<TOOL>_TAG} AS <tool>` (same exact-tag and `ARG` rules as other base images), then `COPY --link --from=<tool> <path> <dest>` in the stage that needs it. The binary is pinned by exact tag, and no package manager, repository, or build dependency enters the image. Path unknown → the image's docs, else inspect the image with `tool-probe` (it asks for approval: never in plan mode, only after approval and before the write; the plan prints an unknown path as `<path pending tool-probe>`; unattended and devcontainer-target runs skip it); unverifiable → install the tool per Install approach. <https://docs.docker.com/build/building/multi-stage/#use-an-external-image-as-a-stage>
- **Required** install approach: never assume how to install a tool or package. When not sure (a tool without an official image, a repository or key setup, a version manager, a runtime), research the vendor's official docs (WebSearch, then WebFetch of the official page) and apply the method they recommend; cite the doc URL in the Output `Changes:` entry. Official docs not found or ambiguous → ask the user (devcontainer target: record it under `Open:`); never fall back to a remembered command or an unverified `curl | sh`.
- Keep compilers and dev dependencies in build stages.

## Packages

- **Required** never pin versions when installing system packages (`apt-get install -y --no-install-recommends curl`, `apk add --no-cache curl`, `dnf install -y curl`) or application packages outside the lockfile (`pip install gunicorn`, `npm install -g pnpm`, `gem install bundler`). Pinned package versions break the build once the repository drops them; freshness comes from the upgrade below, and reproducibility from the exact-tag base image. Lockfile installs (`npm ci`, `pip install -r requirements.txt`, `uv sync --frozen`) keep the versions the lockfile records.
- Update and upgrade system packages in the same `RUN` as the install, unversioned, so the image picks up security fixes the base image tag predates: `apt-get update && apt-get upgrade -y` (never `dist-upgrade`; hadolint DL3005), `apk upgrade --no-cache`, `dnf upgrade -y`. Then upgrade the package managers the build uses, unversioned: `pip install --no-cache-dir --upgrade pip` (no `--no-cache-dir` when a pip cache mount is used), `npm install -g npm`, `corepack` (`corepack enable`, activating the package manager's latest), `gem update --system`. Runtime stage included, since it ships the packages. The exact tag stays the anchor: each rebuild from the same tag then upgrades to the current fixes, and a tag bump restarts from a newer base.
- **Required** clean up in the same layer as the step that creates the files, so nothing reaches the image: package indexes and caches (`rm -rf /var/lib/apt/lists/*`; `apk` with `--no-cache`; `dnf clean all`; `pip --no-cache-dir`; `npm cache clean --force`), build-only dependencies (group them: `apk add --no-cache --virtual .build-deps …` then `apk del .build-deps`; `apt-get purge -y --auto-remove <build deps>`), and temp files (`rm -rf /tmp/* /var/tmp/*`). A cache mount (see Cache) is exempt for its mounted paths only: mounts never land in a layer, so do not delete the mounted paths, but still delete everything else the step creates. Debian and Ubuntu official images already run `apt-get clean`. <https://docs.docker.com/build/building/best-practices/#apt-get>
- hadolint flags unpinned installs, so run it with `--ignore DL3008 --ignore DL3013 --ignore DL3016 --ignore DL3018 --ignore DL3028 --ignore DL3033 --ignore DL3037 --ignore DL3041` (apt, pip, npm, apk, gem, yum, zypper, dnf pin rules). DL3009 (delete apt lists), DL3019 (`apk --no-cache`), DL3042 (`pip --no-cache-dir`), and DL3059 (merge consecutive `RUN`) stay on, matching the cleanup and merge rules. <https://github.com/hadolint/hadolint#rules>

## Cache

- Order layers from least to most often changed: system packages, then manifest + lockfile, then dependency install, then source, then build. A source edit then reuses the install layer. <https://docs.docker.com/build/cache/optimize/#order-your-layers>
- Image copies application files (Clarify default, step 3) → `COPY` only the paths the build or runtime needs (manifest, lockfile, source dirs, config, build output), one `COPY` per group; never `COPY . .` or a whole directory with unrelated content. Unneeded files bloat the image, leak local files, and bust the cache on unrelated edits. Image does not copy application files → no application `COPY`; the app is mounted or supplied at run time. Multi-stage still applies: the build stage installs dependencies with bind mounts of the manifest and lockfile (no `COPY`), and the runtime stage gets only the installed dependencies via `COPY --from=build`; no dependencies either → the build stage prepares the runtime (user, system packages) and the runtime stage copies what it needs. <https://docs.docker.com/build/cache/optimize/#keep-the-context-small>
- Add `.dockerignore` (`.git`, `node_modules`, build output, `.env*`, logs, local tooling) to keep the context small and secrets out. Never ignore a file a `COPY` needs (check `CopyIgnoredFile`). <https://docs.docker.com/build/cache/optimize/#keep-the-context-small>
- Cache mounts for package managers (`RUN --mount=type=cache,target=<path>`); they persist between builds and never land in the image. Verified targets: npm `/root/.npm`, pip `/root/.cache/pip`, Go `/go/pkg/mod` + `/root/.cache/go-build`, Cargo `CARGO_HOME=/var/cache/cargo` + `/app/target/` (a cached dir is not in the layer, so copy the binary out in the same `RUN`, e.g. `cp target/release/app /usr/local/bin/`), Bundler `/root/.gem`, NuGet `/root/.nuget/packages`, Composer `/tmp/cache`. Other tools → take the path from the tool's official Docker docs; none found → no cache mount. <https://docs.docker.com/build/cache/optimize/#use-cache-mounts>
- apt with cache mounts (the lists and cache stay in the mounts, so no list deletion for those paths; still purge build dependencies and temp files): first `rm -f /etc/apt/apt.conf.d/docker-clean` and write `Binary::apt::APT::Keep-Downloaded-Packages "true";` to `/etc/apt/apt.conf.d/keep-cache`; mount `/var/cache/apt` and `/var/lib/apt`, both `sharing=locked` (apt needs exclusive access). <https://docs.docker.com/reference/dockerfile/#example-cache-apt-packages>
- apt without cache mounts: `apt-get update` and `apt-get install -y --no-install-recommends` in the same `RUN`, packages sorted alphabetically, run the upgrade and the Packages cleanup in the same `RUN`, ending with `rm -rf /var/lib/apt/lists/*`. <https://docs.docker.com/build/building/best-practices/#apt-get>
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
- Recommended: `RUN --network=none` for steps that need no network, such as a build or compile after the dependency install, so they cannot fetch or leak anything. <https://docs.docker.com/reference/dockerfile/#run---network>
- Absolute `WORKDIR`; never `RUN cd …` (check `WorkdirRelativePath`). <https://docs.docker.com/build/building/best-practices/#workdir>
- `COPY` for local files; `ADD` only for remote artifacts, with `--checksum=sha256:<sum>`. <https://docs.docker.com/build/building/best-practices/#add-or-copy>

## Secrets and config

- Secrets only via `RUN --mount=type=secret,id=<id>` (file at `/run/secrets/<id>`, or `env=<VAR>`), built with `--secret id=<id>,src=<file>`. Never `ARG` or `ENV`: they show in `docker history` (check `SecretsUsedInArgOrEnv`). <https://docs.docker.com/reference/dockerfile/#run---mounttypesecret>
- `ARG` for build-time values (not kept in the image); `ENV` for runtime values. Each `ENV` persists in its layer even if unset later. <https://docs.docker.com/build/building/best-practices/#env>
- `ENV`/`LABEL` in `key=value` form (check `LegacyKeyValueFormat`).
- `LABEL` with OCI keys the facts support, e.g. `org.opencontainers.image.source`, `org.opencontainers.image.licenses`, `org.opencontainers.image.authors`. Unknown value → leave the label out.

## Runtime

- Non-root user (Clarify default, step 3) → create a system group and user with the same name, name and IDs from `ARG`s with the user's defaults, redeclared inside the stage that uses them (a global `ARG` is not visible after `FROM` otherwise). `COPY --chown=${APP_USER}:${APP_USER}` app files, then `USER ${APP_UID}:${APP_GID}` (numeric, so Kubernetes `runAsNonRoot` can verify it). No `sudo`. <https://docs.docker.com/build/building/best-practices/#user>

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

- Recommended: the `Build:` hint adds `--sbom=true --provenance=mode=max`, so the image carries an SBOM and provenance attestations (needs the containerd image store or a `docker-container` builder). <https://docs.docker.com/build/metadata/attestations/>

## Devcontainer target

Input `target=devcontainer` builds the image a dev container runs; the workspace is mounted, and the container runs the editor's command, not the app. These items replace the practices they name by id; every other item still applies.

- Replaces `Structure/multi-stage`: single stage `FROM … AS dev` on the given `mcr.microsoft.com/devcontainers/<image>` base. Multi-stage only pays off when a runtime stage receives build artifacts. <https://containers.dev/guide/dockerfile>
- `Structure/pinned` still applies: the caller passes an exact full tag, so no run-time tag resolution applies.
- Replaces `Cache/application files`, `Runtime/CMD`, `Runtime/EXPOSE`, `Runtime/HEALTHCHECK`: no application `COPY`, `CMD`, `ENTRYPOINT`, `EXPOSE`, or `HEALTHCHECK`; the workspace is bind-mounted and devcontainer.json owns commands and ports. Each `copy=<src>:<dest>` file → `COPY --chmod=0755 <src> <dest>`. <https://docs.docker.com/reference/dockerfile/#copy---chmod>
- Replaces `Runtime/non-root user`, its no-`sudo` clause included: no user creation and no `USER`. The base image ships a non-root user with `sudo`, set as the remote user through its metadata. Every instruction runs as root (the build's default); a `sudoers=` line goes to `/etc/sudoers.d/<name>` with mode `0440`.
- `.dockerignore` at the context root is an allowlist: `*`, then `!<src>` per `copy=` file. The context also holds devcontainer.json, compose files, and `.env`; ignoring all of it keeps credentials out of the build, and the exceptions satisfy `CopyIgnoredFile`. <https://docs.docker.com/build/concepts/context/#dockerignore-files>

## Checks

- Validate: `docker build --check .` runs only the build checks; the `# syntax=docker/dockerfile:1` line pulls a frontend that supports them. The `# check=error=true` line makes a plain `docker build` fail on the same violations. <https://docs.docker.com/build/checks/>
- Lint: `hadolint` with the Packages `--ignore` flags, whenever installed. A parse error on a file with a heredoc (hadolint cannot parse a heredoc followed by more instructions) → `skipped (heredoc)`; `docker build --check` still covers the file.
- Test (default target only): `docker build` of the Dockerfile to a throwaway tag, then `docker image inspect` that its `User` matches the planned user (and `ExposedPorts` the planned port), then remove the image. A build or inspect mismatch is a finding; no docker, or a build whose error says `Cannot connect to the Docker daemon` → `skipped (no docker)`. The devcontainer CLI builds the devcontainer target, so it is not tested here.
