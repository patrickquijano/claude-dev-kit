# Sync

Details step 2 (**Sync**) failure paths. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

A tag clobber error from `fetch-tags` → `Stopped: 2: tag-conflict: <git error>`; any other fetch error → `Stopped: 2: <git error>`. `ff-main` is the only way to move `main`: it fails on diverged history → stop. Local `main` ahead of the remote is not an error to git, so require `head-sha` = `origin-main-sha` (commit = that sha), else `Stopped: 2: main-not-synced: local main has commits the remote lacks`. Never push `main`.
