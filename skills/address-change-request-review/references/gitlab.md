# GitLab feedback commands

Host section of `cdk:address-change-request-review` (host = any `origin` host other than `github.com`); the GitHub counterpart is `github.md`. Item and state rules: `${CLAUDE_SKILL_DIR}/references/state.md`. A change request is a merge request; `<iid>` is its number. "Re-fetch" means `glab api -X GET projects/:id/merge_requests/<iid>`.

## Pre-flight

Run in order; any failure → report the exact error line and stop.

1. `inside-tree` prints `true`; Root = `toplevel`; Branch = `branch` (`HEAD` = detached → stop).
2. `glab auth status` fails → stop, tell the user to run `glab auth login`.
3. `glab api projects/:id` fails (origin is not a GitLab project) → stop. Keep the response as Project (`id`, `path_with_namespace`, `default_branch`).
4. Self = `glab api user` (`id`, `username`).
5. Scratch = `mktemp -d`.
6. `dirty-paths` non-empty → Dirty (see `flow.md`).

MR API reads, other reads (`glab api projects/<source_project_id>`), and every write stay permission-prompted; the MCP read tools below (`get_user`, `get_project`, `list_merge_requests`, `get_merge_request`) are pre-approved. Model text goes through scratch files and `--input <file>`.

## MCP tools

Call the MCP tool first; server not connected, error, or `—` → run the command unchanged. Writes keep their gates; no write MCP tool is in `allowed-tools`.

| Operation                                                                      | MCP tool                                         |
| ------------------------------------------------------------------------------ | ------------------------------------------------ |
| `glab auth status`                                                             | —                                                |
| `glab api projects/:id`, `glab api projects/<source_project_id>`               | `mcp__plugin_gitlab_gitlab__get_project`         |
| `glab api user`                                                                | `mcp__plugin_gitlab_gitlab__get_user`            |
| `glab mr list`                                                                 | `mcp__plugin_gitlab_gitlab__list_merge_requests` |
| `glab api -X GET projects/:id/merge_requests/<iid>` (re-fetch)                 | `mcp__plugin_gitlab_gitlab__get_merge_request`   |
| `glab api -X GET projects/:id/merge_requests/<iid>/reviewers`                  | —                                                |
| `glab api -X GET --paginate projects/:id/merge_requests/<iid>/discussions`     | —                                                |
| `glab api projects/:id/merge_requests/<iid>/discussions/<id>/notes -X POST`    | —                                                |
| `glab api projects/:id/merge_requests/<iid>/notes -X POST`                     | `mcp__plugin_gitlab_gitlab__save_note`           |
| `glab api projects/:id/merge_requests/<iid>/discussions/<id> -X PUT` (resolve) | —                                                |
| `glab api graphql -X POST` (`mergeRequestReviewerRereview`)                    | —                                                |

## Find

- Number argument (strip `!`) → re-fetch; `state` must be `opened`. Author not Self → the skill's co-author ask.
- Else `glab mr list --source-branch <Branch> -F json`: one match → use it; several → ask from the matches (`--yes` → stop, it needs a number).
- Else `## Candidates`.

## Candidates

`glab mr list --author <username> -F json`. Keep MRs with an unresolved resolvable discussion or a reviewer `state` `requested_changes` (`glab api -X GET projects/:id/merge_requests/<iid>/reviewers`; discussions per `## Gather`). Save each result under Scratch and pass the paths to the collector. Print iid, title, source → target, and the reason each qualified.

## Branch

Remote = the `git remote -v` entry whose URL matches the source project (`source_project_id` → `glab api projects/<source_project_id>` `ssh_url_to_repo` / `http_url_to_repo`); none → stop and report. Head ref = `source_branch`; expected head SHA = `diff_refs.head_sha` from a re-fetch after `git fetch <remote> <source_branch>`.

## Gather

- Details: re-fetch; keep `title`, `description`, `author`, `reviewers`, `source_branch`, `target_branch`, `source_project_id`, `web_url`, `diff_refs`, `draft`, `state`.
- Threads: `glab api -X GET --paginate projects/:id/merge_requests/<iid>/discussions` → `<scratch>/discussions.json`. The collector drops system notes and discussions started by Self; it keeps resolvable, unresolved threads and non-resolvable individual notes by others created after Self's last commit or note on the MR (never resolve candidates). A thread whose last note is by Self is `awaiting reviewer`; skip it unless the input names it.
- Reviewers: `glab api -X GET projects/:id/merge_requests/<iid>/reviewers` → `<scratch>/reviewers.json`.
- Save each result under Scratch and pass paths, never contents, to agents.

## Re-fetch before a mutation

Re-fetch and re-read the discussions. Require: `state` `opened`; `diff_refs.head_sha` equals the expected SHA (the pushed HEAD after a push, else the SHA recorded at fetch); the target discussion still exists and its `resolved` flag is as recorded. Head is a commit not ours → report "new commits on the MR", stop. Mismatch → stop that operation and report the field. Retry a stale head at most 3 times, 5 s apart (GitLab may lag after a push).

## Mutations

Orchestrator only, after the Gate B approval and the re-fetch, one item at a time, each recorded in `ops[]` straight after success:

- Thread reply: write `{"body":…}` to scratch; `glab api projects/:id/merge_requests/<iid>/discussions/<id>/notes -X POST -H 'Content-Type: application/json' --input <file>`; record the returned note `id` as `replyId`.
- General comment (reply to a non-thread note, or the revision summary): write `{"body":…}`; `glab api projects/:id/merge_requests/<iid>/notes -X POST -H 'Content-Type: application/json' --input <file>`; open a reply body with a quote of the item's first line and its link. The revision summary is skipped when `cr:<n>:summary` is in `ops[]`, else that key is recorded after success (`state.md` `## Idempotency`).
- Resolve: write `{"resolved":true}`; `glab api projects/:id/merge_requests/<iid>/discussions/<id> -X PUT -H 'Content-Type: application/json' --input <file>`; only per the state.md resolve rule.
- Never call: merge, approve, unapprove, delete a note, or reopen a discussion.

## Re-request

Per target: write `{"query":"mutation($p:ID!,$i:String!,$u:UserID!){mergeRequestReviewerRereview(input:{projectPath:$p,iid:$i,userId:$u}){errors}}","variables":{"p":"<path_with_namespace>","i":"<iid>","u":"gid://gitlab/User/<id>"}}` to scratch; `glab api graphql -X POST -H 'Content-Type: application/json' --input <file>`. Top-level `errors` or `data.mergeRequestReviewerRereview.errors` non-empty, or an HTTP error → report the exact line, continue with the next target.

## Verify after mutations

Re-read discussions: each posted reply is present once (marker match); each resolved thread has `resolved` true. `glab api -X GET projects/:id/merge_requests/<iid>/reviewers`: each re-requested target's `state` is no longer `requested_changes`. Mismatch → report the field; do not retry a reply, only re-check.
