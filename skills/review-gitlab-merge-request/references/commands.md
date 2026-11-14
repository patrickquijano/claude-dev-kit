# Commands

`<host>`, `<url>`, `<enc>`, `<iid>`, `<sha>`, `<path>`, `<enc-file>`, `<head>`, `<discussion id>`, `<note id>`, `<last sha>`, `<file>` are literal values from Pre-flight and Resolve (see `gitlab-mapping.md`); text bodies go to scratch files, never inline in a shell argument; `<path>` is validated and single-quoted per the Rules in `SKILL.md`; `<enc-file>` is the URL-encoded path; `<last sha>` comes from a comment, so use it only when it matches `^[0-9a-f]{40}$`, never otherwise. MCP names are hints: discover the real ones at runtime with ToolSearch (`gitlab merge request`); `—` = no MCP tool, run the Command. Run `glab <command> --help` before the first use of each glab command. `glab api` writes send a JSON body from `--input <file>` or `-F body=@<file>`.

| Name | MCP tool (hint) | Command (`glab` fallback) | Purpose |
| --- | --- | --- | --- |
| `auth-status` | — | `glab auth status --hostname <host>` | Must succeed in the fallback, else tell the user to run `glab auth login --hostname <host>` |
| `origin` | — | `git remote get-url origin` | Host and project path of the working directory (preloaded in Context) |
| `branch` | — | `git branch --show-current` | Current branch for the branch match (preloaded in Context) |
| `project-check` | `mcp__plugin_gitlab_gitlab__get_project` (`project_id`: the path) | — | MCP host check: `web_url` host equals the remote host |
| `self` | `mcp__plugin_gitlab_gitlab__get_user` (`me: true`) | `node ${CLAUDE_SKILL_DIR}/scripts/glab-get.mjs <host> user` | Username of the reviewer (`username`) |
| `mr-for-branch` | — (`list_merge_requests` has no source-branch filter) | `glab mr list -R <url> --source-branch '<head>' --output json` | Open MRs (the default) for the current branch; empty = no match |
| `mr-view` | `mcp__plugin_gitlab_gitlab__get_merge_request` (`project_id`, `merge_request_iid`, or `url`) | `glab mr view <iid> -R <url> --output json` | Details, state, `draft`, head SHA, `diff_refs`, head pipeline status |
| `mr-diff` | `mcp__plugin_gitlab_gitlab__get_merge_request` (`include: [diffs]`, `detail: full_patch`) | `glab mr diff <iid> -R <url> --raw` | Unified diff to scratch |
| `compare-diff` | — | `node ${CLAUDE_SKILL_DIR}/scripts/glab-get.mjs <host> 'projects/<enc>/repository/compare?from=<last sha>&to=<sha>'` | Read: files changed since the last reviewed SHA (re-review); each entry's `diff` goes to scratch as a unified patch; a 404 or unknown commit (e.g. after a force-push) → use `mr-diff` instead |
| `file-at-sha` | `mcp__plugin_gitlab_gitlab__get_repository_file` (`project_id`, `file_path`, `ref: <sha>`) | `node ${CLAUDE_SKILL_DIR}/scripts/glab-get.mjs <host> 'projects/<enc>/repository/files/<enc-file>/raw?ref=<sha>'` | One file at the head SHA to scratch |
| `mr-issues` | — | `node ${CLAUDE_SKILL_DIR}/scripts/glab-get.mjs <host> projects/<enc>/merge_requests/<iid>/closes_issues` | Issues the MR closes (`iid`) |
| `issue-view` | `mcp__plugin_gitlab_gitlab__get_work_item` (`project_id`, `work_item_iid`) | `glab issue view <iid> -R <url> --output json` | Linked issue text |
| `review-threads` | `mcp__plugin_gitlab_gitlab__get_merge_request` (`include: [discussions]`) | `glab api --hostname <host> --paginate 'projects/<enc>/merge_requests/<iid>/discussions?per_page=100'` | Read: discussions with their notes and `resolved` state; also the own summary lookup (individual notes by Self with the marker, its id and `Last reviewed SHA:`) |
| `head-sha` | `mcp__plugin_gitlab_gitlab__get_merge_request` (no `include`) | `glab mr view <iid> -R <url> --output json` | Re-fetch the head SHA and state before posting |
| `thread-resolve` | `mcp__plugin_gitlab_gitlab__save_merge_request_review` (`method: resolve_discussion`, `resolved: true`) | `glab api --hostname <host> projects/<enc>/merge_requests/<iid>/discussions/<discussion id> -X PUT -F resolved=true` | Write: resolve one discussion |
| `approvals` | — | `node ${CLAUDE_SKILL_DIR}/scripts/glab-get.mjs <host> projects/<enc>/merge_requests/<iid>/approvals` | Read: `approved_by` (own approval = Self's username in it) |
| `approve` | `mcp__plugin_gitlab_gitlab__save_merge_request_review` (`method: approve`, `sha: <head>`) | `glab mr approve <iid> -R <url> --sha <head>` | Write: approve, refused when the head moved |
| `unapprove` | `mcp__plugin_gitlab_gitlab__save_merge_request_review` (`method: unapprove`) | `glab mr unapprove <iid> -R <url>` | Write: remove the own approval while a gating discussion is unresolved |
| `review-post` | `mcp__plugin_gitlab_gitlab__save_merge_request_review` (`method: submit_review`, `comments` only; no `summary` or `verdict`) | — | Write: the inline discussions (at most 20 per call); each body starts with its severity and ends with the marker |
| `inline-comment` | — | `glab api --hostname <host> projects/<enc>/merge_requests/<iid>/discussions -X POST --input <file>` | Write: one inline comment; the file holds `body` and `position` (`position_type: text`, `base_sha`, `start_sha`, `head_sha`, `old_path`, `new_path`, `new_line`) |
| `summary-post` | `mcp__plugin_gitlab_gitlab__save_note` (`method: create_note`, `body`) | `glab api --hostname <host> projects/<enc>/merge_requests/<iid>/notes -X POST -F body=@<file>` | Write: the one summary note (first review); the body carries the marker |
| `summary-update` | — | `glab api --hostname <host> projects/<enc>/merge_requests/<iid>/notes/<note id> -X PUT -F body=@<file>` | Write: edit the own summary note in place (re-review); never a new note. No `glab` → stop and tell the user |
