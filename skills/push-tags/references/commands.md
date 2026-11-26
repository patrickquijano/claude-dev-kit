# Commands

`<path>`, `<root>`, `<remote>`, `<branch>`, and `<tag>` are literal values, always in single quotes.

Rows use the plain `git <subcommand> …` form with the repository root as the working directory. Only when `<path>` is not the working directory, run `repo-root` and every later `git` row as `git -C '<root>' <subcommand> …` (`repo-root` with `-C '<path>'`); `-C` is outside `allowed-tools`, so the permission prompt approves it.

| Name | Command | Purpose | MCP tool |
| --- | --- | --- | --- |
| `repo-root` | `git rev-parse --show-toplevel` | Repository root; failure = not a repository | — |
| `current-branch` | `git symbolic-ref --short -q HEAD` | Current branch; failure = detached | — |
| `branch-remote` | `git config --get 'branch.<branch>.remote'` | Remote the branch tracks; `.` = local | — |
| `remote-url` | `git remote get-url '<remote>'` | Remote exists | — |
| `tag-diff` | `node "${CLAUDE_SKILL_DIR}/scripts/tag-diff.mjs" '<root>' '<remote>'` | JSON: `unpushed`, `mismatches`, `remoteTags`, or an error | — |
| `push` | `git push '<remote>' 'refs/tags/<tag1>' 'refs/tags/<tag2>' …` | Publish exactly the unpushed tags | — |
