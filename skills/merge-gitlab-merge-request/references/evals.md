# Evals

Cases for `merge-gitlab-merge-request`: standard merges, refusals, tool fallback, and remote parsing. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                       | prompt                                                               | expected                                                                                  | pass                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| green-squash             | "Merge MR 12." (approved, pipeline green, `mergeable`, same-project) | Asks Method and Branch, then squashes                                                     | One question call; `Tool: mcp accept_merge_request`; `sha` passed; `squash_commit_sha` non-empty                     |
| refusal-verbatim         | "Merge MR 12." (the host refuses the merge)                          | Reports the host's exact error                                                            | `Result: stopped`; `Stopped: 5`; error text reported unchanged; no auto-merge                                        |
| mcp-down                 | "Merge MR 12." (GitLab MCP not connected, `glab` authed)             | Falls back to glab                                                                        | `Fallbacks:` lists each step; `merge-glab` runs once with `--auto-merge=false` and `--sha`                           |
| auto-invoke              | A natural request for the action, no `/cdk:` command                 | Claude loads the skill on its own                                                         | The skill runs; the MR is merged after the decision questions                                                        |
| grill-close-call         | A decision question whose top two totals are ≤5 apart                | Table before the question; no Recommended                                                 | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked |
| github-remote-stops      | "Merge the MR." (`origin` is `git@github.com:o/r.git`)               | Stops at pre-flight                                                                       | `Result: stopped`; `Stopped: 1: no GitLab remote`; no write                                                          |
| nested-group-self-hosted | "Merge MR 12." (`origin` is `git@gitlab.example.com:a/b/c.git`)      | Resolves host and the full project path                                                   | Host `gitlab.example.com`, path `a/b/c`, `<enc>` `a%2Fb%2Fc`; no `a/b` truncation                                    |
| auth-403-stops           | "Merge MR 12." (`get_project` or `glab api` returns 403)             | Stops with the fix                                                                        | `Result: stopped`; `Stopped: 1`; fix names `glab auth login --hostname <host>`; no token printed                     |
| no-approval-step         | "Merge MR 12."                                                       | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions                                   |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
