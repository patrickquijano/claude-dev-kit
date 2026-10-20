# Flow details

## Contents

- Pre-flight · Sync · Plan · Check state

## Pre-flight

- `root` (Context) is where later commands run, and `<root>/CHANGELOG.md` must exist, else stop: `changelog missing`.
- Context → Branch = `main`, else stop with the branch name. Never fix state yourself (no checkout, stash, commit).

## Sync

A tag clobber error from `fetch-tags` → `Stopped: 2: tag-conflict: <git error>`; any other fetch error → `Stopped: 2: <git error>`. `ff-main` is the only way to move `main`; it fails on diverged history → stop. Local `main` ahead of the remote is not a git error, so require `head-sha` = `origin-main-sha` (that sha is the tag commit), else `Stopped: 2: main-not-synced: local main has commits the remote lacks`. Never push `main`.

## Plan

- `changelog-version` prints the first released heading; no match → `Stopped: 3: no-released-version: add a release section with cdk:update-changelog`. The version is the text between the brackets.
- Prefix: `--prefix v` or `--prefix none` wins. Otherwise `list-tags`: only `v<digit>` tags → `v`; only bare `<digit>` tags → none; no tags, or both forms → ask which form (`v1.0.0` or `1.0.0`; reason: no clear convention in existing tags), or stop when unattended: `Stopped: 3: prefix-unknown: pass --prefix`.
- Tag = prefix + version.

## Check state

Read-only, before any write. `local-tag` succeeds or `remote-tag` prints a line → `Result: nothing-to-do`, with `Tag:` unchanged and `Checks:` tag `exists`; never compare, reuse, or move it.
