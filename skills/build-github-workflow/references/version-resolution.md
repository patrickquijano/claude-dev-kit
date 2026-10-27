# Version resolution

Resolve fresh on every run; never use a remembered value. Network lookups that fail → leave the value for the user and list it under `Unverified:`.

## Contents

- Actions · Declared language versions · Runner labels · Unresolved

## Actions

1. Keep an existing valid pin as is (update mode), unless the user asked to upgrade.
2. Latest release tag: `gh api repos/<owner>/<repo>/releases/latest --jq .tag_name`. If that fails or the repo publishes no releases: `git ls-remote --tags --refs https://github.com/<owner>/<repo>` and take the highest stable `vX.Y.Z` (ignore pre-releases).
3. A floating major tag (`v4`) → find the full `vX.Y.Z` that it points to, from the same tag list.
4. Tag → commit SHA: `git ls-remote https://github.com/<owner>/<repo> refs/tags/<tag> 'refs/tags/<tag>^{}'`. An annotated tag lists a `^{}` line; use that SHA, else the plain line.
5. Write `uses: <owner>/<repo>@<sha> # <tag>`.

## Declared language versions

Use the version the repo declares (`.nvmrc`, `.node-version`, `engines`, `.python-version`, `go.mod`, `global.json`, `.tool-versions`). Pass the file to the setup action's `*-version-file` input when it has one. Nothing declared → ask; never invent one.

## Runner labels

Read the "Available Images" table in the `actions/runner-images` README (`gh api repos/actions/runner-images/contents/README.md --jq .content`, base64-decoded). Use a generally available label only (never beta or preview), keep the job's current architecture, default x64. Never `*-latest`. An existing resolved label stays.

## Unresolved

Leave the value as a visible placeholder the validator flags, and list it under `Unverified:` with the command that failed.
