# Image resolution

Pin every `image:` and `services:` entry to an exact tag found now, never a recalled one.

## Selection

- List the image's tags; keep full `X.Y.Z` tags (plus the variant suffix, such as `-alpine` or `-slim`, when one is wanted).
- Drop pre-release tags: patterns seen in that image's own tags, such as `rc`, `alpha`, `beta`, `nightly`, `dev`, `preview`.
- Keep the variant the stack file names; never switch variants unasked.
- Pick the highest `X.Y.Z` by numeric order. Stay within a major the project declares (`engines`, `go.mod`, `.ruby-version`).

## Fallback order

Run `node ${CLAUDE_SKILL_DIR}/scripts/resolve-image-tag.mjs <image> [variant]`. It tries, in order, each tool that is installed:

1. `crane ls`
2. `skopeo list-tags`
3. `regctl tag ls`
4. Registry HTTP API through Node `fetch`: the Docker Hub API for Docker Hub images, the OCI `tags/list` API with an anonymous token for `ghcr.io`, `quay.io`, `gcr.io` and `<region>.gcr.io`, `<region>-docker.pkg.dev`, `registry.gitlab.com`, `mcr.microsoft.com`, `public.ecr.aws`, and `registry.k8s.io`; other registries are skipped

Exit 0 → read the JSON: `image`, `tag`, `method`, `tried`. Exit 2 → unresolved: try a web lookup of the registry or the image's page; still nothing → ask the user for the tag. An unresolved tag stays visible in the file and is listed under `Unverified:`.

## Update rule

Only files being changed get new tags. An unchanged file keeps its pins, even when newer ones exist; mention outdated pins under `Open:`.
