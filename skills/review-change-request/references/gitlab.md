# GitLab review conventions

Host section of `cdk:review-change-request` (host = any `origin` host other than `github.com`); the GitHub counterpart is `github.md`. Host-neutral rules: `flow.md`. A change request is a merge request; `<iid>` is its number. "Re-fetch" means `glab api -X GET projects/:id/merge_requests/<iid>`.

## Contents

- Pre-flight · Select · Gather · Criteria · Positions · Publish · Verify · Approve · Merge · API rules

## Pre-flight

Run in order; any failure → report the exact error line and stop. A detached `HEAD` is fine (a remote MR needs no branch).

1. `inside-tree` = `true`; Root = `root`; Branch = `branch`.
2. `glab auth status` fails → stop, tell the user `glab auth login`.
3. `glab api projects/:id` fails (origin is not a GitLab project) → stop. Keep it as Project (`id`, `path_with_namespace`, `default_branch`).
4. Self = `glab api user` (`id`, `username`). Scratch = `scratch`.

## MCP tools

Call the MCP tool first; server not connected, error, or `—` → run the command unchanged. Writes keep their gates; no write MCP tool is in `allowed-tools`.

| Operation                                                                      | MCP tool                                                                                        |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `glab auth status`                                                             | —                                                                                               |
| `glab api projects/:id`                                                        | `mcp__plugin_gitlab_gitlab__get_project`                                                        |
| `glab api user`                                                                | `mcp__plugin_gitlab_gitlab__get_user`                                                           |
| `glab mr list`                                                                 | `mcp__plugin_gitlab_gitlab__list_merge_requests`                                                |
| `glab api -X GET projects/:id/merge_requests/<iid>` (re-fetch)                 | `mcp__plugin_gitlab_gitlab__get_merge_request`                                                  |
| `glab api -X GET projects/:id/merge_requests/<iid>/reviewers`                  | —                                                                                               |
| `glab api -X GET projects/:id/merge_requests/<iid>/approvals`                  | —                                                                                               |
| `glab api -X GET --paginate projects/:id/merge_requests/<iid>/discussions`     | —                                                                                               |
| `glab api projects/:id/merge_requests/<iid> -X PUT` (add reviewer)             | `mcp__plugin_gitlab_gitlab__save_merge_request`                                                 |
| `glab api -X GET projects/:id/merge_requests/<iid>/draft_notes`                | —                                                                                               |
| `glab api projects/:id/merge_requests/<iid>/draft_notes -X POST`               | —                                                                                               |
| `glab api projects/:id/merge_requests/<iid>/draft_notes/bulk_publish -X POST`  | —                                                                                               |
| `glab api projects/:id/merge_requests/<iid>/draft_notes/<id> -X DELETE`        | —                                                                                               |
| `glab api projects/:id/merge_requests/<iid>/approve -X POST`                   | —                                                                                               |
| `glab api projects/:id/merge_requests/<iid>/unapprove -X POST`                 | —                                                                                               |
| `glab api projects/:id/merge_requests/<iid>/discussions/<id> -X PUT` (resolve) | —                                                                                               |
| `glab api projects/:id/merge_requests/<iid>/merge -X PUT`                      | `mcp__plugin_gitlab_gitlab__accept_merge_request` (same `sha` guard and fields as `merge.json`) |

## Select

- Number argument (strip a leading `!`) → re-fetch; `state` not `opened` → report, stop.
- Else current = `git rev-parse --abbrev-ref HEAD`; `glab mr list --source-branch <current> -F json`: one match → use it; several (forks) → ask from the matches.
- Else `glab mr list -F json` (open); sort by `updated_at` desc; table label `!<iid> <title>`, description `<source> → <target>, @<author>`.
- A typed number must be an open MR from that list or confirmed `opened` by a re-fetch.

## Gather

- Re-fetch: keep `title`, `description`, `author`, `reviewers`, `source_branch`, `target_branch`, `web_url`, `diff_refs` (`base_sha`, `start_sha`, `head_sha`), `head_pipeline`, `detailed_merge_status`, `draft`, `source_project_id`, `target_project_id`. `diff_refs` empty → re-fetch up to 3 times, still empty → stop. Head = `diff_refs.head_sha`, base = `diff_refs.base_sha`.
- Reviewer states: `glab api -X GET projects/:id/merge_requests/<iid>/reviewers`. Approvals: `glab api -X GET projects/:id/merge_requests/<iid>/approvals` (`approvals_left`, `approved_by`).
- Threads: `glab api -X GET --paginate projects/:id/merge_requests/<iid>/discussions` → digest (author, path:line, full first note, last note, `changed-since`). Prior threads = discussions with `resolvable: true`, `resolved: false`, any author; keep the last note's `created_at` for `commit-dates`. Baseline = max note `id` here (`## Verify` counts notes above it).
- Local objects: `git cat-file -e <head_sha>^{commit}` fails → `git fetch origin refs/merge-requests/<iid>/head`. Base likewise from `origin`. Fetch only; never check out or merge.
- Merge base: `git merge-base <base_sha> <head_sha>`; none → stop. Then `git diff <mb>..<head_sha>` → `<scratch>/diff.patch`, `git diff --name-status <mb>..<head_sha>` → `name-status.txt`, `git log <mb>..<head_sha>` → `log.txt`. Empty diff → nothing-to-do.

## Criteria

- A4: `head_pipeline.status` = `success` and `detailed_merge_status` not `ci_must_pass`, `ci_still_running`, `status_checks_must_pass`, `checking`, or `unchecked` → pass. `head_pipeline` null and no such status → pass, note "no pipeline found (may not be created yet)". Pending, running, or checking → fail "checks not finished; re-run the review after they finish".
- A7: `approvals_left` = 0, or = 1 and Self not in `approved_by` → pass. Else fail, listing pending approvals.
- Merge blockers (add to the neutral ones): `detailed_merge_status` not in {`mergeable`, `not_approved`}.

## Positions

Draft-note body: `{"note":…,"position":{"position_type":"text","base_sha":<base_sha>,"start_sha":<start_sha>,"head_sha":<head_sha>,"old_path":…,"new_path":…,<lines>}}`. `<lines>`: `new` → `new_line` only; `old` → `old_line` only; `both` → both. Renames keep distinct `old_path` / `new_path`. Suggestions: `suggestion:-N+M` fenced block on added or context lines (`-N+M` extends N lines above and M below, max 100 each); never on removed lines.

## Publish

1. Re-fetch; `diff_refs.head_sha` changed → "new commits pushed", stop.
2. Add Self as reviewer when absent, without asking: `glab api projects/:id/merge_requests/<iid> -X PUT -f reviewer_ids[]=<ids>` with the existing reviewer ids plus Self; never remove one. A failure is reported and does not block.
3. `glab api -X GET projects/:id/merge_requests/<iid>/draft_notes` non-empty (your old drafts; bulk publish sends them all) → AskUserQuestion: Delete old drafts (Recommended) | Publish them too | Cancel. `--yes` never deletes or publishes the user's drafts → stop, nothing posted (`Stopped: 10: existing draft notes`). Cancel → stop, nothing posted, `Result: cancelled`.
4. Approving (per `## Approve`) → approve first: `glab api projects/:id/merge_requests/<iid>/approve -X POST -f sha=<head_sha>`. `409` → "new commits pushed", stop, nothing posted. Other error (for example `401`, self-approval disabled) → report the exact error line; the verdict stays `reviewed` with note "Approval failed: <error>"; continue.
5. Per inline finding write `## Positions` body to scratch; `glab api projects/:id/merge_requests/<iid>/draft_notes -X POST -H 'Content-Type: application/json' --input <file>`; keep the returned `id`.
6. Per General non-praise finding: `{"note":…}` (no `position`; publishes as a resolvable thread), POST as above. The summary lists each only by subject plus "see its thread".
7. Per kept prior thread (any author): `{"note":"<reply text>","in_reply_to_discussion_id":<id>,"resolve_discussion":true}`, POST as above; under `--yes` a thread by another author gets the same body without `resolve_discussion` (reply only).
8. `{"note":<summary>,"reviewer_state":<requested_changes | reviewed>}` to `…/draft_notes/bulk_publish -X POST -H 'Content-Type: application/json' --input <file>`.
9. Any create or publish fails → report the exact error line; delete created drafts (`…/draft_notes/<id> -X DELETE`); approved in step 4 → `…/unapprove -X POST`; the reviewer added in step 2 is reported, not reverted. Never publish a partial review.

## Verify

`glab api -X GET --paginate projects/:id/merge_requests/<iid>/discussions`: notes by Self with `system: false` and `id` above the baseline = inline count + General thread count + kept thread count + old drafts published + 1. Each thread this run resolves: first note `resolved: true`; else `glab api projects/:id/merge_requests/<iid>/discussions/<id> -X PUT -F resolved=true`, re-check; still unresolved → mismatch `thread <id>`. `glab api -X GET projects/:id/merge_requests/<iid>/reviewers`: Self `state` matches. Approved → `…/approvals`: Self in `approved_by`.

## Approve

Approval is `…/approve` with the head `sha` (`## Publish` step 4), set only when A1–A7 pass and the user picks it (or `--yes`). Self already in `approved_by` → skipped, noted. A failed self-approval does not block the merge when `approvals_left` is 0.

## Merge

- Offered only when the `flow.md` `## Verdict` merge items hold, `detailed_merge_status` is `mergeable` or `not_approved`, and approvals will be satisfied (`approvals_left` 0 after Self's approval). Options: the MR's own squash and delete-source settings, overridden by `--squash` / `--delete-branch` (an enforced squash wins, noted). Merge applies only with an approval, or when Self already approved; other combinations → `Merged: no (approval not given)`.
- Run (after verify): re-fetch; `diff_refs.head_sha` changed → "new commits pushed", stop. `detailed_merge_status` `checking` or `approvals_syncing` → re-fetch up to 3 times. Re-fetch `…/discussions`: any discussion whose id is in the prior-thread set (`flow.md` `## Prior threads`) and still `resolved: false` → `Merged: no (unresolved threads: <n>)`, stop. Require `state` `opened`, `detailed_merge_status` `mergeable`, and `…/approvals` `approvals_left` 0; else report the field, stop. `glab api projects/:id/merge_requests/<iid>/merge -X PUT -H 'Content-Type: application/json' --input <scratch>/merge.json`, where the file (written with the file tool, so the title never reaches a shell) holds `{"sha":"<head_sha>","squash":<bool>,"squash_commit_message":"<MR title> (!<iid>)","should_remove_source_branch":<bool>}` (the `sha` guards against new commits; omit `squash` when enforced). Include `squash_commit_message` only when squash is true, so the squash commit is the MR title with no body. Response `state` `merged` → done; other state without error → re-fetch, report `state`, `Merged: no (pending)`. `409` → "new commits pushed"; `405`/`406`/`422` → the exact error line and current `detailed_merge_status`; `401` → no merge permission. On any error the review and approval stay posted; stop.

## API rules

- Read MR endpoints only as `glab api -X GET projects/:id/merge_requests/…` (add `--paginate` for lists); none is pre-approved. A command starting `glab api -X GET` never carries a second `-X`/`--method` (the last one wins and would turn a read into a write).
- Writes (POST, PUT, DELETE) start `glab api <endpoint> -X <METHOD>`, never the `-X GET` prefix. JSON bodies go to a scratch file and `--input <file>`; never inline user or model text in shell args; `-f`/`-F` only for API-sourced values (SHAs, ids) or fixed literals.
- Writes (draft notes, approve, unapprove, resolve, reviewer PUT, merge, and their MCP write tools) stay out of `allowed-tools`, so each gets a permission prompt: the only confirmation for posting and the reviewer PUT, a second one for approve and merge.
