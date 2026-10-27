# Evals

Cases for `merge-gitlab-merge-request`: standard and blocked merges, tool fallback, and remote parsing. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                       | prompt                                                               | expected                                  | pass                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| green-squash             | "Merge MR 12." (approved, pipeline green, `mergeable`, same-project) | Asks Method and Branch, then squashes     | One question call; `Tool: mcp accept_merge_request`; `sha` passed; `squash_commit_sha` non-empty                     |
| blocked-no-bypass        | "Merge MR 12." (own MR, `not_approved`)                              | Stops with blockers                       | `Result: stopped`; `Stopped: 7`; no bypass offered; no merge call, no auto-merge                                     |
| not-eligible             | "Merge MR 12." (another author, `requested_changes`)                 | Stops                                     | `Result: stopped`; blockers and who acts listed; no merge call                                                       |
| draft                    | "Merge MR 12." (draft)                                               | Stops                                     | Report says mark it ready; no merge command                                                                          |
| pipeline-running         | "Merge MR 12." (`ci_still_running`)                                  | Stops, never arms auto-merge              | `Result: stopped`; blocker `Pipeline still running`; no `--auto-merge` true, no `strategy`                           |
| mcp-down                 | "Merge MR 12." (GitLab MCP not connected, `glab` authed)             | Falls back to glab                        | `Fallbacks:` lists each step; `merge-glab` runs once with `--auto-merge=false` and `--sha`                           |
| auto-invoke              | A natural request for the action, no `/cdk:` command                 | Claude loads the skill on its own         | The skill runs; its existing confirm or plan approval still precedes any write or push                               |
| grill-close-call         | A decision question whose top two totals are ≤5 apart                | Table before the question; no Recommended | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked |
| github-remote-stops      | "Merge the MR." (`origin` is `git@github.com:o/r.git`)               | Stops at pre-flight                       | `Result: stopped`; `Stopped: 1: no GitLab remote`; no write                                                          |
| nested-group-self-hosted | "Merge MR 12." (`origin` is `git@gitlab.example.com:a/b/c.git`)      | Resolves host and the full project path   | Host `gitlab.example.com`, path `a/b/c`, `<enc>` `a%2Fb%2Fc`; no `a/b` truncation                                    |
| auth-403-stops           | "Merge MR 12." (`get_project` or `glab api` returns 403)             | Stops with the fix                        | `Result: stopped`; `Stopped: 1`; fix names `glab auth login --hostname <host>`; no token printed                     |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
