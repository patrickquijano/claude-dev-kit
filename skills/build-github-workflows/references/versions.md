# Version resolution

Procedure only; this file holds no versions. Resolve every value on each run, then write the verified values into the workflows (Actions cannot resolve these references at run time). Never guess, never reuse a remembered version, never fall back to an older one. Unverifiable item → return it under `Unresolved`; the skill asks once or stops. The `gh api` and `git ls-remote` commands below run in `cdk:version-resolver`, which owns them, so they have no `commands.md` row.

## Pin form

Every action, remote reusable workflow, and image is pinned by its exact tag (`vX.Y.Z`), never a commit hash or an image hash. A repo or org policy that requires hash pinning is not applied: the analyzer reports it and the skill lists it under `Open:` for the user to decide. Source: <https://docs.github.com/en/actions/reference/security/secure-use>.

## Actions and reusable workflows (third-party and remote)

Per `owner/repo`:

1. Latest release: `gh api repos/<owner>/<repo>/releases/latest --jq .tag_name`. The endpoint returns the most recent non-prerelease, non-draft release; 404 → the repo publishes no releases, so list tags (`git ls-remote --tags --refs https://github.com/<owner>/<repo>`), drop any tag with a prerelease suffix (`-rc`, `-alpha`, `-beta`, `-pre`, `-dev`, `-next`), and take the highest numeric semver; still nothing → `Unresolved`. Source: <https://docs.github.com/en/rest/releases/releases#get-the-latest-release>.
2. Most specific tag: the full `vX.Y.Z` release tag. Floating majors (`v4`) move and are never written.
3. Verify the tag exists in that repo, never a fork: `git ls-remote --tags --refs https://github.com/<owner>/<repo> refs/tags/<tag>`. For an action with a subpath (`owner/repo/path`) the tag applies to `owner/repo`. Source: <https://git-scm.com/docs/git-ls-remote>.
4. Written form: `owner/repo@vX.Y.Z`.
5. Local reusable workflows (`./.github/workflows/<file>.yml`) and local composite actions (`./.github/actions/<name>`) take no version.
6. Actions with their own runtime requirement (for example a Node version) → read the action's `action.yml` at the resolved tag only when the request needs it; never infer it.

Source for pin guidance: <https://docs.github.com/en/actions/reference/security/secure-use>.

## Runner label

1. Read the Linux x64 labels from <https://docs.github.com/en/actions/reference/runners/github-hosted-runners> and <https://github.com/actions/runner-images/blob/main/README.md>.
2. Keep labels of the form `ubuntu-<YY>.<MM>` (x64 unless the request needs arm64, then the `-arm` form). Drop `ubuntu-latest` (floating), `ubuntu-slim` (a different image family; use only when asked), any label the README marks `Beta`, `Preview`, or `Deprecated`, and any label the docs do not list.
3. Take the highest by numeric comparison. Neither source says "GA" in words, so report the label as `no beta, preview, or deprecated badge`, cite both URLs, and say it is inferred.
4. Both sources must list the label; one-source label → ask. When the highest is not an LTS release (`ubuntu-YY.04`), return `Unresolved` with the options newest or newest LTS (the highest `.04`). The README says `-latest` moves to a newer OS gradually and advises pinning a version.
5. Self-hosted or other OS runners come from the user, never resolved here.

## Container and service images

1. Docker Hub image: list `https://hub.docker.com/v2/namespaces/<namespace, library for official>/repositories/<repo>/tags?page_size=100&name=<major.minor>` (<https://docs.docker.com/reference/api/hub/latest/operations/ListRepositoryTags/>), page through `next` until exhausted, at most 10 pages (cap reached with no match → `Unresolved`), keep tags matching the allowlist `^<digits>(\.<digits>)+-<variant>$` (the allowlist excludes `-rc`, `-alpha`, `-beta`, `-nightly`, `-preview`, `-dev`; no variant requested: `^<digits>(\.<digits>)+$`), and take the highest by numeric semver comparison, never by update time. The variant is the one the request or the repo already uses.
2. Other registries (`ghcr.io`, `mcr.microsoft.com`, …): the tag cannot be listed here → ask the user for the tag or the registry's tag page; never guess.
3. Written form: `image: <name>:<tag>`.
4. Never `latest`, a bare major, or a floating alias (`-alpine`, `-slim`).

## Tool versions inside jobs

- Language and tool versions (Node, Python, Go, …) come from the repo's version files (`.nvmrc`, `.python-version`, `go.mod`, `.tool-versions`) or the request, passed to the setup action as input; never invented. No source → ask. Setup-action input names come from its `action.yml` at the resolved tag.

## Return table

`<ref> | <tag or label> | <source URL> | <note>` per resolved item, then `Unresolved: <item — reason — suggested question | none>`.
