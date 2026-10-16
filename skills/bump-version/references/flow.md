# Flow details

## Contents

- Inputs · Check · Confirm · Bump · Changelog · Re-check · Open items

## Inputs

- `check`: check-only mode for chainers (the release gate, ship-release). Writes nothing, asks nothing, never chains `cdk:update-changelog`.
- `target <branch>`: target override. `subject <path>`: a file whose first line is the subject of a commit still to come; pass it to every call so the required level covers it. `confirmed`: the caller already asked the user; the only way to skip the question.
- Anything else → ask which was meant (chained or unattended: stop, `Stopped: 1: unknown input`).

## Check

Run `check` from the root. JSON `skipped` with note `no release policy` → `Stopped: 1: no release policy`; never create a policy. A failure with `no-remote`, `fetch-failed`, `no-merge-base`, or `unsafe-state` → `Blocked:` with its fix, `Stopped: 2: <code>: <fix>`. Read `level`, `required`, `base`, `target`, `drivers`, and `failures`. `required` follows the 0.x rule (breaking bumps minor, anything else patch, while major is 0) and a policy `versionReset` in a lower major than the base; a `reset` note says so. `skipped` (no release-relevant changes) or no `version-*` failure → the version is fine.

## Confirm

A bump needs the user's confirmation each time and only serves a PR or MR. Without `confirmed`, ask once: `Bump <base> → <required> (<level>) for the upcoming PR/MR (Recommended)` (reason: release-check blocks PR/MR creation and CI without it) | `Skip: no PR/MR planned`. `Skip` → `Result: cancelled`, `Stopped: 2: bump declined`. `--yes`, `auto`, and unattended mode never skip it; unavailable question and no `confirmed` → `Stopped: 2: needs confirmation`. Nothing is written before this ends.

## Bump

Run `bump` (same `--target` and `--subject`), once. `changed` lists `path from -> to`; empty means unchanged. A failure code that is not `version-*`, `changelog-*`, or `uncommitted` → `Blocked:` with its fix. The script sets the required value, or keeps a deliberate higher release that has a matching new changelog section, so a repeat run changes nothing.

## Changelog

The policy's `changelog` path (default `CHANGELOG.md`) missing at the root → `Changelog: skipped (no <path>)`; never create one. Otherwise run Skill `cdk:update-changelog` with `base <target>` in this thread and read its `CHANGELOG:` and `Result:` lines. `stopped` or `cancelled` → `Stopped: 4: update-changelog <result>` (the version edits stay; the caller commits). Never edit the changelog yourself.

## Re-check

Rerun `check` once. `uncommitted` is expected after a bump (the caller commits) and is not a finding. A `changelog-*` failure goes under `Blocked:` with its fix when step 4 was skipped or did not fix it.

## Open items

List each `Blocked:` item and each non-ok `Checks:` entry in `Open:` with the recommended fix and who acts; change nothing. Never commit or push; the caller runs `cdk:commit-changes`.
