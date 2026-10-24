# Release

- User-facing changes need a new `CHANGELOG.md` entry under `Unreleased`.
- Required SemVer level from the branch commits: breaking = major (minor while 0.x), `feat` = minor (patch while 0.x), otherwise patch.
- **Breaking** (mark with `!` or a `BREAKING CHANGE:` footer): a hook that newly blocks, or a change to what it blocks; raising the minimum tool versions in Compatibility.
- A version bump always needs the user's confirmation and happens only for a PR or MR: edit the version in `.claude-plugin/plugin.json` only after the user confirms.
- Verify: `npm test`.
