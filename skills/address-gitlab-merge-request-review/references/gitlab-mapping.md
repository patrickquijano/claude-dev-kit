# GitLab mapping

## Terms

| GitHub         | GitLab                                                        |
| -------------- | ------------------------------------------------------------- |
| Pull request   | Merge request (MR), `!<iid>`                                  |
| Number         | IID (per project, not a global id)                            |
| Base branch    | Target branch                                                 |
| Head branch    | Source branch                                                 |
| Review thread  | Discussion (`id`), resolved when its first note is `resolved` |
| Change request | Reviewer state `requested_changes`                            |
| Failing check  | Failed job in the MR's latest pipeline                        |
| `owner/repo`   | Project path `group[/subgroup…]/project`                      |

## Remote → host and project path

Read `origin` with `origin`, then strip a trailing `.git`:

- `git@<host>:<path>` → host `<host>`, path `<path>`.
- `ssh://[user@]<host>[:<port>]/<path>` → host `<host>`, path `<path>` (drop the port).
- `https://[user@]<host>[:<port>]/<path>` → host `<host>`, path `<path>`.
- The path keeps every group and subgroup (`a/b/c`); `<url>` = `https://<host>/<path>`; `<enc>` = the path URL-encoded (`a%2Fb%2Fc`).
- Host `github.com`, or an unparsable remote → `Stopped: 0: no GitLab remote`. Any other host counts as GitLab when MCP or `glab` authenticates against it.

## MCP host check

Call `get_project` with the project path. Use MCP only when it succeeds and the host of its `web_url` equals the remote host; a different host or a failure → use `glab` with `--hostname <host>`.

## 403 / 404 fix

- 403 → (also on a reply) the token lacks access or the `api` scope: run `glab auth login --hostname <host>` with a token that has the `api` scope, or reconnect the GitLab MCP.
- 404 → the project path or IID is wrong, or the account cannot see the project: re-check `origin` and the input, then confirm membership.
- Report the fix in `Stopped: 0: <reason>`; never print a token.
