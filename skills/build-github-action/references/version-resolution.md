# Version resolution

Resolve fresh on every run; never use a remembered value. A lookup that fails → leave the value for the user and list it under `Unverified:`.

## Contents

- Actions · `runs.using` · npm packages · Docker base image · Runner labels · Next tag

## Actions

Latest release: `gh api repos/<owner>/<repo>/releases/latest --jq .tag_name`; if it fails or there are no releases, `git ls-remote --tags --refs https://github.com/<owner>/<repo>` and take the highest stable `vX.Y.Z`. Then the SHA: `git ls-remote https://github.com/<owner>/<repo> refs/tags/<tag> 'refs/tags/<tag>^{}'`, using the `^{}` line for an annotated tag. Write `uses: <owner>/<repo>@<sha> # <tag>`. Keep an existing valid pin.

## `runs.using`

Take the supported values from the official metadata syntax page (<https://docs.github.com/actions/reference/workflows-and-actions/metadata-syntax>), or from the `action.yml` of a recent first-party action such as `actions/setup-node`, read through `gh api repos/actions/setup-node/contents/action.yml --jq .content` (base64). Use the newest `node<major>` listed there.

## npm packages

`npm view <package> version` for each dependency (for example `@actions/core`); keep an existing specifier's prefix.

## Docker base image

Exact tag from the image's registry, then its digest; write `FROM <image>:<tag>@sha256:<digest>`. Docker unavailable → `Unverified:`.

## Runner labels

From the "Available Images" table of the `actions/runner-images` README (`gh api repos/actions/runner-images/contents/README.md --jq .content`, base64). Generally available labels only, keep the job's architecture (default x64), never `*-latest`.

## Next tag

Existing tags: `git ls-remote --tags --refs <remote>`. Breaking change → next major; new input or output → minor; otherwise patch. Report it; never create it.
