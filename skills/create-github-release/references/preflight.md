# Pre-flight

Details step 1 (**Pre-flight**). Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

- `root` (root; later commands run from it); `remotes` lists `origin`; `gh-version` works; `gh-auth` succeeds (else tell the user to run `gh auth login`).
- `repo-view` = Repo; `viewerPermission` must be `WRITE`, `MAINTAIN`, or `ADMIN` (pushing tags and creating releases need write access). Check that `origin-url` matches Repo's `url` or its `.git`/SSH form, else stop.
- `status` empty (untracked files count), else stop: `working tree not clean`.
- `current-branch` = `main`, else stop with the branch name.
