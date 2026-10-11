# Version resolution

Procedure only; this file holds no versions. Resolve every value on each run, then write the verified values into the workflows (Actions cannot resolve these references at run time). Never guess, never reuse a remembered version, never fall back to an older one. Unverifiable item → return it under `Unresolved`; the skill asks once or stops. Verified 2026-10-10.

## Pinning mode

Decide once per run, in this order; first match wins:

1. `gh api repos/{owner}/{repo}/actions/permissions --jq .sha_pinning_required` is `true` (then the org endpoint `orgs/{org}/actions/permissions` for the repo's owner, when the repo one is `false` or missing) → **SHA**. Source: <https://docs.github.com/en/rest/actions/permissions>. Needs `gh`, auth, and admin rights; a 403, 404, or missing `gh` → fall through, never an error.
2. Every existing third-party `uses:` in the repo is a 40-hex SHA, or repo docs (`SECURITY.md`, `CONTRIBUTING.md`, `.github/dependabot.yml` comments) require it → **SHA**.
3. No signal either way (an explicit `false` counts as no signal when nothing else exists; `gh` missing or unauthenticated, 403 or 404, no existing third-party `uses:`, no docs) → **unknown**: return `Pinning: unknown` and an `Unresolved` question (SHA recommended, since a SHA is valid whether or not enforcement exists; or exact tag). Never default silently.
4. Otherwise (existing pins are tags and no signal requires SHAs) → **tag** (exact release tag).

Report the mode and which rule matched. A tag-mode repo still gets SHAs when the user asks. Only the repo and org endpoints are verified; no enterprise-level endpoint was found in the docs, so an enterprise policy that neither endpoint reports is covered by rule 3 only when no other signal exists.

## Actions and reusable workflows (third-party and remote)

Per `owner/repo`:

1. Latest release: `gh api repos/<owner>/<repo>/releases/latest --jq .tag_name`. The endpoint returns the most recent non-prerelease, non-draft release; 404 → the repo publishes no releases, so list tags (`git ls-remote --tags --refs https://github.com/<owner>/<repo>`), drop any tag with a prerelease suffix (`-rc`, `-alpha`, `-beta`, `-pre`, `-dev`, `-next`), and take the highest numeric semver; still nothing → `Unresolved`. Source: <https://docs.github.com/en/rest/releases/releases#get-the-latest-release>.
2. Most specific tag: the full `vX.Y.Z` release tag. Floating majors (`v4`) move and are never written.
3. Commit SHA for the tag: `git ls-remote https://github.com/<owner>/<repo> refs/tags/<tag> refs/tags/<tag>^{}`. A `^{}` line is the annotated tag's commit → use it; with no `^{}` line the first line is a lightweight tag's commit. Source: <https://git-scm.com/docs/git-ls-remote>. The SHA must come from that repo, never a fork.
4. Verify the action ref exists: for an action with a subpath (`owner/repo/path`) the tag applies to `owner/repo`.
5. Written form: tag mode `owner/repo@vX.Y.Z`; SHA mode `owner/repo@<40-hex> # vX.Y.Z`.
6. Local reusable workflows (`./.github/workflows/<file>.yml`) take no version.
7. Actions with their own runtime requirement (for example a Node version) → read the action's `action.yml` at the resolved tag only when the request needs it; never infer it.

Source for pin guidance: <https://docs.github.com/en/actions/reference/security/secure-use>.

## Runner label

1. Read the Linux x64 labels from <https://docs.github.com/en/actions/reference/runners/github-hosted-runners> and <https://github.com/actions/runner-images/blob/main/README.md>.
2. Keep labels of the form `ubuntu-<YY>.<MM>` (x64 unless the request needs arm64, then the `-arm` form). Drop `ubuntu-latest` (floating), `ubuntu-slim` (a different image family; use only when asked), any label the README marks `Beta`, `Preview`, or `Deprecated`, and any label the docs do not list.
3. Take the highest by numeric comparison. Neither source says "GA" in words, so report the label as `no beta, preview, or deprecated badge`, cite both URLs, and say it is inferred.
4. Both sources must list the label; one-source label → ask. When the highest is not an LTS release (`ubuntu-YY.04`), return `Unresolved` with the options newest or newest LTS (the highest `.04`). The README says `-latest` moves to a newer OS gradually and advises pinning a version.
5. Self-hosted or other OS runners come from the user, never resolved here.

## Container and service images

1. Docker Hub image: resolve the exact stable tag by the tag rule in `../write-dockerfile/practices.md` (relative to this file's directory) `## Structure` (base image tag resolution: Hub tag listing, release-tag allowlist, variant and distro rules, highest numeric semver, never `last_updated`); do not restate it here. Tag list API: <https://docs.docker.com/reference/api/hub/latest/operations/ListRepositoryTags/>.
2. Other registries (`ghcr.io`, `mcr.microsoft.com`, …): the tag cannot be listed here → ask the user for the tag or the registry's tag page; never guess.
3. Digest (SHA mode only, or when asked): `docker buildx imagetools inspect <image>:<tag> --format '{{json .Manifest}}'` and read its `digest` (the documented form; the top-level manifest or index digest). `--format '{{json .Manifest.Digest}}'`, used by `write-dockerfile` and `scan-vulnerabilities`, returned the same digest when tested 2026-10-10 but is not in the docs, so use the documented form here. No docker → `Unresolved`. Source: <https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/>.
4. Written form: tag mode `image: <name>:<tag>`; SHA mode `image: <name>:<tag>@sha256:<digest>`.
5. Never `latest`, a bare major, or a floating alias (`-alpine`, `-slim`).

## Tool versions inside jobs

- Language and tool versions (Node, Python, Go, …) come from the repo's version files (`.nvmrc`, `.python-version`, `go.mod`, `.tool-versions`) or the request, passed to the setup action as input; never invented. No source → ask. Setup-action input names come from its `action.yml` at the resolved tag.

## Return table

`<ref> | <tag or label> | <sha or digest | -> | <source URL> | <note>` per resolved item, then `Pinning: <tag | SHA | unknown> (<rule>)`, then `Unresolved: <item — reason — suggested question | none>`.
