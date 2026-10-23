# Flow details

## Contents

- Pre-flight · Sync · Plan · Check state · Open items

## Pre-flight

- `root` (Context) is where later commands run, and `changelog-head` must succeed (`CHANGELOG.md` committed at `HEAD`), else stop: `changelog missing`.
- Resolve `<default>` per Rules (read the policy file; else `default-branch`). Context → Branch = `<default>`, else stop with the branch name. Never fix state yourself (no checkout, stash, commit).

## Sync

A tag clobber error from `fetch-tags` → `Stopped: 2: tag-conflict: <git error>`; any other fetch error → `Stopped: 2: <git error>`. `ff-default` is the only way to move `<default>`; it fails on diverged history → stop. Local `<default>` ahead of the remote is not a git error, so require `head-sha` = `origin-tip` (that sha is the tag commit), else `Stopped: 2: main-not-synced: local <default> has commits the remote lacks`. Never push `<default>`.

## Plan

- `changelog-head` prints the committed changelog; the first heading matching `## [x.y.z...]` (not `Unreleased`) is the release; none → `Stopped: 3: no-released-version: add a release section with cdk:update-changelog`. The version is the text between the brackets and must be valid SemVer; a date after `-` must be a real `YYYY-MM-DD` date. Invalid, a pre-release version (a `-` suffix after `x.y.z`), or a heading containing `[YANKED]` → `Stopped: 3: bad-heading: <heading>`. The changelog path is always `CHANGELOG.md` at the root (`changelog-head`).
- Prefix: `--prefix v` or `--prefix none` wins. Otherwise `list-tags`: only `v<digit>` tags → `v`; only bare `<digit>` tags → none; no tags, or both forms → ask which form (`v1.0.0` or `1.0.0`; reason: no clear convention in existing tags), or stop when unattended: `Stopped: 3: prefix-unknown: pass --prefix`.
- Tag = prefix + version.

## Check state

Read-only, before any write. `local-tag` succeeds or `remote-tag` prints a line → `Result: nothing-to-do`, with `Tag:` unchanged and `Checks:` tag `exists`; never compare, reuse, or move it.

## Open items

List each `Stopped:` cause that the user must act on (a diverged or unsynced default branch, `tag-conflict`, a rejected push, an existing tag) in `Open:` with the recommended fix; change nothing. No item → `Open: none`.
