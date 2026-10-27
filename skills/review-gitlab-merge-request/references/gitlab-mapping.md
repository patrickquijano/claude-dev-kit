# GitLab mapping

## Terms

| GitHub                   | GitLab                                                           |
| ------------------------ | ---------------------------------------------------------------- |
| Pull request             | Merge request (MR), `!<iid>`                                     |
| Number                   | IID (per project, not a global id)                               |
| Base / head branch       | Target / source branch                                           |
| `owner/repo`             | Project path `group[/subgroup…]/project`                         |
| Review thread            | Discussion (`resolvable` true, first note a diff note)           |
| Resolve thread           | Resolve the discussion                                           |
| Review event             | Verdict word in the summary note; `APPROVE` also approves the MR |
| Checks                   | Head pipeline status                                             |
| Closing issue references | Issues the MR closes (`closes_issues`)                           |
| Draft                    | `draft` true (`Draft:` title prefix)                             |

## Remote → host and project path

Read `origin` with `origin`, then strip a trailing `.git`:

- `git@<host>:<path>` → host `<host>`, path `<path>`.
- `ssh://[user@]<host>[:<port>]/<path>` → host `<host>`, path `<path>` (drop the port).
- `https://[user@]<host>[:<port>]/<path>` → host `<host>`, path `<path>`.
- The path keeps every group and subgroup (`a/b/c`); `<url>` = `https://<host>/<path>`; `<enc>` = the path URL-encoded (`a%2Fb%2Fc`).
- A URL argument `https://<host>/<path>/-/merge_requests/<iid>` gives its own host, path, and IID (it may differ from the working directory).
- Host `github.com`, or an unparsable remote → `Stopped: 1: no GitLab remote`. Any other host counts as GitLab when MCP or `glab` authenticates against it.

## MCP host check

Call `get_project` with the project path. Use MCP only when it succeeds and the host of its `web_url` equals the remote host; a different host or a failure → use `glab` with `--hostname <host>`.

## 403 / 404 fix

- 403 → the token lacks access or the `api` scope: run `glab auth login --hostname <host>` with a token that has the `api` scope, or reconnect the GitLab MCP.
- 404 → the project path or IID is wrong, or the account cannot see the project: re-check `origin` and the input, then confirm membership.
- Report the fix in `Stopped: <step>: <reason>`; never print a token.
