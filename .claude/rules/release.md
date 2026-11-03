# Release

- Required SemVer level from the branch commits: breaking = major (minor while 0.x), `feat` = minor (patch while 0.x), otherwise patch.
- **Breaking** (mark with `!` after the type or scope; commits are subject-only): a hook that newly blocks, or a change to what it blocks; removing or renaming a skill or subagent; raising the minimum tool versions in Compatibility.
- A version bump happens only for a PR or MR. The version comes from the user's answer to the step-1 version question or a valid `[version]` argument; `--yes` takes the recommended version and lists it under `Open:`. Edit the version in `.claude-plugin/plugin.json` only after that.
- Tags: annotated, for the latest `CHANGELOG.md` version, on the verified tip of the default branch; never `--force`, never bump the version while tagging.
- Publish: `.github/workflows/release.yml` builds the GitHub release from the pushed version tag's (`vX.Y.Z`) section in `CHANGELOG.md` (prerelease for a `-` suffix). Use `/cdk:create-github-release` only to edit an existing release or to recover when that workflow run failed.
- Verify: `npm test`.
