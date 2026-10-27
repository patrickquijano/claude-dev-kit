# Flow details

## Contents

- Pre-flight · Sync · Check state · Create · Open items

## Pre-flight

- `root` (Context) is where later commands run; `remotes` lists `origin`; `gh-version` works; `gh-auth` succeeds (else tell the user to run `gh auth login`).
- `repo-view` = Repo; `viewerPermission` must be `WRITE`, `MAINTAIN`, or `ADMIN`. Context → Origin must match Repo's `url` (or its `.git` or SSH form), else stop.
- `status` empty (untracked files count), else stop: `working tree not clean`. Resolve `<default>` from `default-branch` (strip `origin/`); none → stop. Context → Branch = `<default>`, else stop with the branch name. Never fix state yourself (no stash, commit, checkout).

## Sync

A tag clobber error from `fetch-tags` → `Stopped: 2: tag-conflict: <git error>`; any other fetch error → `Stopped: 2: <git error>`. `ff-default` is the only way to move `<default>`: when `head-sha` differs from `origin-tip`, ask `Fast-forward local <default> to origin/<default> (Recommended)` | `Stop` first (Stop → `Result: cancelled`; a user-passed `--yes` skips the ask; unattended without it → `Stopped: 2: unattended, not confirmed`); equal tips → skip it. It fails on diverged history → stop. Local `<default>` ahead of the remote is not a git error, so require `head-sha` = `origin-tip` (that sha is the release commit), else `Stopped: 2: default-not-synced: local <default> has commits the remote lacks`. Never push `<default>`.

## Check state

Read-only, before any write.

- Release: `release-view` succeeds → exists; also match `release-list` by `tagName` (the route to drafts). Exists (code `release-exists`: not a Stopped code) → `Release: <url> (already exists)`, `Result: nothing-to-do`; never modify it. The `release not found` error means absent; any other error → stop with its text.
- `local-tag`, and `remote-tag` (the `^{}` line's id is the commit of an annotated tag, else the line's id). Each tag found must equal the verified commit, else `Stopped: 4: tag-mismatch: <tag> points to <sha>, <default> is <sha>`; local and remote must agree.
- State → action: none → create and push; local only (at the commit) → push it; remote present → reuse.

## Create

- Per the state from `local-tag` and `remote-tag`: run `create-tag` only when no local tag exists (it fails on an existing tag, so a rerun skips it), then `push-tag` only when the remote lacks the tag (plain, never force). A rejected push → stop; nothing is retried. Output `Tag:` says `created`, `pushed existing`, or `reused` accordingly.
- `create-release` (no `--draft`, `--prerelease`, or `--target`); `--verify-tag` aborts rather than letting GitHub create a lightweight tag. Failure after the tag is pushed → `Stopped: 6: release-create-failed: <error>`; the tag stays and a rerun reuses it.
- `verify-release`: draft or prerelease true, or the tag missing → list it in `Blocked:`; never edit.

## Open items

Collect `Blocked:`, failed `Checks:`, and `Stopped:` into `Open:` with the recommended fix and who acts; change nothing. A stop from step 2 onward (conflict, sync failure, `tag-mismatch`, rejected push, `release-create-failed`) lists what is left; `release-exists` ends `nothing-to-do` with no `Stopped:`.
