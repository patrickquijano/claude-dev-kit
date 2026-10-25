# Flow details

## Contents

- Pre-flight · Sync · Plan · Check state · Open items

## Pre-flight

- `root` (Context) is where later commands run.
- Resolve `<default>` per Rules (`default-branch`). Context → Branch = `<default>`, else stop with the branch name. Never fix state yourself (no checkout, stash, commit).

## Sync

A tag clobber error from `fetch-tags` → `Stopped: 2: tag-conflict: <git error>`; any other fetch error → `Stopped: 2: <git error>`. `head-sha` = `origin-tip` → nothing to move. Different → plan `ff-default` for the step 5 confirmation and run it only in step 6; it is the only way to move `<default>` and fails on diverged history → stop. Local `<default>` ahead of the remote is not a git error, so after the fast-forward `head-sha` must equal `origin-tip` (that sha is the tag commit), else `Stopped: 6: default-not-synced: local <default> has commits the remote lacks`. Never push `<default>`.

## Plan

- Run `next-tag` with `--ref origin/<default>` (the tag commit, even before the fast-forward) and `--prefix` when given. It prints one JSON object: `ok` with `version`, `prefix`, `prefixSource`, `tag`, or `ok: false` with `code`, `message`, `fix`. The version is the first `## [x.y.z]` heading of the committed changelog (`Unreleased` skipped).
- Stop codes: `no-released-version` → `Stopped: 3: no-released-version: add a release section to the changelog`; `bad-heading` (invalid SemVer, bad date, pre-release, or `[YANKED]`) → `Stopped: 3: bad-heading: <message>`; `bad-prefix` or `bad-ref` → `Stopped: 3: <code>`; `changelog-missing` (`CHANGELOG.md` not committed at `origin/<default>`) → `Stopped: 3: changelog missing`.
- `prefix-unknown` (no tags, or both forms) → ask which form (`v1.0.0` or `1.0.0`; reason: no clear convention in existing tags) and run `next-tag --prefix <answer>`; unattended → `Stopped: 3: prefix-unknown: pass --prefix`.

## Check state

Read-only, before any write. `local-tag` succeeds or `remote-tag` prints a line → `Result: nothing-to-do`, `Stopped: none`, with `Tag:` unchanged and `Checks:` tag `exists`; never compare, reuse, or move it.

## Open items

An existing tag is `nothing-to-do`, not a stop: `Open: none`. List each `Stopped:` cause that the user must act on (a diverged or unsynced default branch, `tag-conflict`, a rejected push) in `Open:` with the recommended fix; change nothing. No item → `Open: none`.
