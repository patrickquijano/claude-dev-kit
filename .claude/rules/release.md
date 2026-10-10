# Release

- Repos with `.claude/release-policy.json` need a new `CHANGELOG.md` entry under `Unreleased` and the required SemVer version in every `versionFiles` entry before any PR or MR is created. Required level from the branch commits: breaking = major, `feat` = minor, otherwise patch, from the target branch tip.
- One script holds the logic: `hooks/scripts/release-check.mjs` (`check`, `bump`, `hook`). The PR/MR skills' release gate (`skills/prepare-pull-request/release-gate.md`), the project `PreToolUse` hook, and the CI job `release-check` all call it; never duplicate its checks.
- Fix a failure with `cdk:write-changelog` and `cdk:bump-version`, then `cdk:commit-changes` (atomic commits, pushed). Never hand-edit the version to satisfy the check.
- Exceptions exist only as `exempt` entries in the policy, each with a reason; a policy change is a reviewed diff. Never bypass the hook or gate, never edit the policy only to make a check pass, never `--no-verify`.
- `release-check` must stay a required status check on `main`; local hooks can be bypassed, CI cannot.
- Verify: `npm test`, then `node hooks/scripts/release-check.mjs check --target main`.
