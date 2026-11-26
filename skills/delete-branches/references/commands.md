# Commands

`<p>` is a protected name or glob; `<root>`, `<remote>`, `<branch>`, `<upstream-branch>`, `<owner>`, `<repo>`, and `<id>` are literal values, always in single quotes. In a `host-get` endpoint, a `/` inside `<branch>` is written `%2F`. A `--protected` value is a name or glob with no `'`, control character, or leading `-`; `list-branches` exits 2 on any other, so drop that name from the set (a branch name with `'` is skipped anyway).

Rows use the plain `git <subcommand> …` form with the repository root as the working directory. Only when the root is not the working directory, run each `git` row as `git -C '<root>' <subcommand> …`; `-C` is outside `allowed-tools`, so the permission prompt approves it.

| Name | Command | Purpose | MCP tool |
| --- | --- | --- | --- |
| `repo-root` | `git rev-parse --show-toplevel` | Repository root; failure = not a repository | — |
| `remotes` | `git remote -v` | Remote names and URLs | — |
| `remote-url` | `git remote get-url '<remote>'` | Remote URL; names the host | — |
| `default-branch` | `git ls-remote --symref '<remote>' HEAD` | Default branch from the `ref: refs/heads/<name>` line | — |
| `current-branch` | `git rev-parse --abbrev-ref HEAD` | Current branch; `HEAD` = detached | — |
| `worktrees` | `git worktree list --porcelain` | Branches checked out in any worktree | — |
| `fetch-all` | `git fetch --all --prune` | Refresh remote-tracking refs and drop stale ones | — |
| `list-local` | `node "${CLAUDE_SKILL_DIR}/scripts/list-branches.mjs" '<root>' local '<remote>' --protected '<p>' …` | JSON: `candidates`, `excluded`, `skipped`, `pages`; `<remote>` unused for local | — |
| `list-remote` | `node "${CLAUDE_SKILL_DIR}/scripts/list-branches.mjs" '<root>' remote '<remote>' --protected '<p>' …` | Same JSON for remote-tracking branches | — |
| `github-protected` | `node ${CLAUDE_SKILL_DIR}/scripts/host-get.mjs github 'repos/<owner>/<repo>/branches?protected=true'` | GitHub branches with classic protection (GET only; the script adds `--paginate`) | GitHub MCP `list_branches` (`protected`) |
| `github-rules` | `node ${CLAUDE_SKILL_DIR}/scripts/host-get.mjs github 'repos/<owner>/<repo>/rules/branches/<branch>'` | Ruleset rules on a branch; a non-empty list = protected | — |
| `gitlab-protected` | `node ${CLAUDE_SKILL_DIR}/scripts/host-get.mjs gitlab 'projects/<id>/protected_branches'` | GitLab protected branches and wildcards; `<id>` = URL-encoded path | GitLab MCP `list_branches` (protected) |
| `ff-merge` | `git merge --ff-only '<upstream>'` | Fast-forward the current branch to its upstream | — |
| `ff-update` | `git fetch '<remote>' '<upstream-branch>:<branch>'` | Fast-forward a non-current branch; refuses non-fast-forward | — |
| `delete-local` | `git branch -d '<branch>'` | Delete a merged local branch | — |
| `branch-sha` | `git rev-parse --short '<branch>'` | Tip sha of a branch left undeleted as not fully merged | — |
| `delete-remote` | `git push '<remote>' --delete '<branch>'` | Delete one remote branch | — |
| `prune-remote` | `git fetch '<remote>' --prune` | Drop the deleted remote-tracking refs | — |
