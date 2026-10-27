# Release

- Required SemVer level from the branch commits: breaking = major (minor while 0.x), `feat` = minor (patch while 0.x), otherwise patch.
- **Breaking** (mark with `!` after the type or scope; commits are subject-only): a hook that newly blocks, or a change to what it blocks; removing or renaming a skill or subagent; raising the minimum tool versions in Compatibility.
- A version bump always needs the user's confirmation and happens only for a PR or MR: edit the version in `.claude-plugin/plugin.json` only after the user confirms.
- Tags: annotated, for the latest `CHANGELOG.md` version, on the verified tip of the default branch; never `--force`, never bump the version while tagging.
- Verify: `npm test`.
