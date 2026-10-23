# Release

- Repos with `.claude/release-policy.json` need a new `CHANGELOG.md` entry under `Unreleased` and the required SemVer version in every `versionFiles` entry before any PR or MR is created. Required level from the branch commits: breaking = major (minor while 0.x), `feat` = minor (patch while 0.x), otherwise patch, from the target branch tip. A higher version is allowed only with a matching new release section (`## [x.y.z]`, absent on the target) in the changelog.
- **Breaking** (mark with `!` or a `BREAKING CHANGE:` footer): renaming or removing a skill, slash command, or agent; changing a skill's arguments or required inputs, or an agent's `## Return` format callers parse; a hook that newly blocks, or a change to what it blocks; changing the `.claude/release-policy.json` schema or the release-check CLI; raising the minimum tool versions in Compatibility.
- Policy `versionReset` (`{version, reason}`) lets the check accept one deliberate downgrade to a lower major than the target tip; it does nothing once merged (the majors then match), so remove the entry in a later PR.
- Never duplicate the checks of `release-check.mjs`; chain `cdk:bump-version` instead.
- `check` and `bump` accept `--subject <file>` (first line = the subject of a commit still to come) so the required level covers it; `/cdk:ship-release` does not need it: it commits first, then bumps.
- A version bump always needs the user's confirmation and happens only for a PR or MR: `cdk:bump-version` asks each time, `--yes` and `auto` never skip it, and only the release gate passes `confirmed` after its own question.
- Fix a failure with `cdk:bump-version` (it chains `cdk:update-changelog` when a changelog exists; otherwise run `cdk:update-changelog`). Never hand-edit the version to satisfy the check.
- Exceptions exist only as `exempt` entries in the policy, each with a reason; a policy change is a reviewed diff. Never bypass the gate, never edit the policy only to make a check pass.
- `release-check` must stay a required status check on `main`; local checks can be bypassed, CI cannot.
- Never add GitLab CI; GitLab MRs rely on the skill gate only.
- Verify: `npm test`, then `node skills/bump-version/scripts/release-check.mjs check --target main`.
