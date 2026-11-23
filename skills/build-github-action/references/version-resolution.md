# Version resolution

Resolve fresh on every run; never use a remembered value. A lookup that fails → leave the value for the user and list it under `Unverified:`.

## Contents

- Actions · `runs.using` · npm packages · Docker base image · Runner labels · Next tag

## Actions

Latest release: `gh api repos/<owner>/<repo>/releases/latest --jq .tag_name`; if it fails or there are no releases, `git ls-remote --tags --refs https://github.com/<owner>/<repo>` and take the highest stable `vX.Y.Z`. Then the SHA: `git ls-remote --tags https://github.com/<owner>/<repo> refs/tags/<tag> 'refs/tags/<tag>^{}'`, using the `^{}` line for an annotated tag. Write `uses: <owner>/<repo>@<sha> # <tag>`. Keep an existing valid pin.

## `runs.using`

Take the supported values from the official metadata syntax page (<https://docs.github.com/actions/reference/workflows-and-actions/metadata-syntax>), or from the `action.yml` of a recent first-party action such as `actions/setup-node`, read through `gh api -H 'Accept: application/vnd.github.raw+json' repos/actions/setup-node/contents/action.yml`. Use the newest `node<major>` listed there.

## npm packages

`npm view <package> version` for each dependency (for example `@actions/core`); keep an existing specifier's prefix.

## Docker base image

Resolve the exact tag for a Docker Hub image with WebFetch on `https://hub.docker.com/v2/namespaces/<namespace; library for an official image>/repositories/<repo>/tags?page_size=100&name=<major.minor>` (<https://docs.docker.com/reference/api/hub/latest/operations/ListRepositoryTags/>). Page through `next`, at most 10 pages; keep tags matching `^\d+\.\d+\.\d+(-<variant>)?$` and take the highest by numeric major, minor, patch comparison. Another registry, a failed lookup, or the page cap reached → ask for the tag (`--yes`: list it under `Unverified:`); never guess or use a remembered tag. Then take its digest from the `Digest:` line of `docker buildx imagetools inspect <image>:<tag>`; write `FROM <image>:<tag>@sha256:<digest>`. Docker unavailable → `Unverified:`.

## Runner labels

From the "Available Images" table of the `actions/runner-images` README (`gh api -H 'Accept: application/vnd.github.raw+json' repos/actions/runner-images/contents/README.md`). Generally available labels only, keep the job's architecture (default x64), never `*-latest`.

## Next tag

Existing tags: `git ls-remote --tags --refs <remote>`. Breaking change → next major; new input or output → minor; otherwise patch. Report it; never create it.
