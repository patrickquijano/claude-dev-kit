# Docker

## Detect

`Dockerfile`, `compose.yaml`, `.dockerignore`. A project that ships an image builds it in CI.

## Cache

- Layer cache through the registry or BuildKit cache, not `cache:`; use `cache:` only for tool caches in other jobs.

## Build and reports

- Build with the `docker` image and a `docker:dind` service (version-pinned tags, resolved at workflow step 4), or rootless Buildah/Kaniko when the runner lacks privileged mode.
- Tag with `$CI_COMMIT_SHORT_SHA`; push to `$CI_REGISTRY_IMAGE`; login with `$CI_REGISTRY_USER` and `$CI_REGISTRY_PASSWORD`.
- Report types: `container_scanning` when the project enables it. Set `expire_in`.

## Image

Image family `docker`, plus a `docker` dind service tag that matches it; resolve both full tags.

## Deploy

Push release tags only on tags or the default branch; an `environment` per target.
