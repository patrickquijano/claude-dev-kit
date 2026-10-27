# Resolve

Steps 1–2 of `SKILL.md`. Any failure → print the exact error line and stop.

## Pre-flight

Run in order:

1. `origin` (Context → Origin) parsed per `gitlab-mapping.md`; host `github.com` or unparsable → `Stopped: 1: no GitLab remote` ("this skill reviews GitLab MRs only").
2. The MCP host check (`gitlab-mapping.md`); when it fails, `auth-status` must succeed, else tell the user to run `glab auth login --hostname <host>`. Neither works → `Stopped: 1: no GitLab MCP and no glab auth`. `Tool:` records `mcp`, `glab`, or `mcp+glab`.
3. `self` → Self (username of the reviewer).
4. Scratch = the session scratchpad directory plus `review-<iid>`; created by the first Write.

## Resolve

- A URL argument `https://<host>/<path>/-/merge_requests/<iid>` → use its host, project path, and IID (it may differ from the working directory); run `mr-view`.
- An IID argument (strip `!`) → `mr-view` in the working directory's project.
- No argument → `mr-for-branch` with Context → Branch. Detached or `<none>` branch, or no open MR for it → `Result: nothing-to-do`.
- Never fall back to another MR, a list, or a guess; an argument that is neither a URL nor an IID → stop.

## State rules

- `merged`, `closed`, or `locked` → `Result: stopped`, `Stopped: resolve: MR is <state>`; post nothing.
- `draft` true → continue; the verdict is never `APPROVE`: `COMMENT`, or `REQUEST_CHANGES` when the rules require it (`analyze.md` `## Verdict`).
- Keep: host, project path, IID, URL, title, author username, head SHA (the full 40 characters: `diff_refs.head_sha`), `diff_refs.base_sha` and `diff_refs.start_sha`, target and source branch, and whether the source project differs from the target project. A fork MR is read-only and reviewed the same way, since nothing is checked out.
- Own MR = author username equals Self; `post.md` `## Own MR` covers it.
