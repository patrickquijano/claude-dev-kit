# Evals

Cases for `review-gitlab-merge-request`: confirmation, thread handling, verdicts, remote parsing, and guards. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                       | prompt                                                                   | expected                             | pass                                                                                   |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------- |
| clean-mr                 | "Review MR 9." (no findings, pipeline green, complete)                   | Asks Post or Stop, then approves     | One confirm before any write; `Verdict: APPROVE`; approve carries the head SHA         |
| approve-with-nits        | "Review MR 9." (only Suggestions and Nitpicks, pipeline green, complete) | Approves, posts them as non-blocking | `Verdict: APPROVE`; the items appear in the review                                     |
| open-thread-reply        | "Review MR 9." (a thread opened by the author, change still missing)     | Replies, does not resolve            | Reply `Not addressed at <sha>`; discussion stays unresolved                            |
| gate-skips-review        | "Review MR 9." (one judged Open thread)                                  | Skips the diff analysis              | `Review scope: threads only`; `Verdict: REQUEST_CHANGES`; no reviewer subagent spawned |
| declined                 | "Review MR 9." (user picks Stop)                                         | Writes nothing                       | `Result: cancelled`; `Review: not posted (declined)`                                   |
| foreign-thread           | "Review MR 9." (a fixed thread opened by a third person)                 | Replies, does not resolve            | Reply left for the opener; listed under `Open:`; no resolve                            |
| closed-mr                | "Review MR 9." (merged)                                                  | Stops                                | `Result: stopped`; `Stopped: resolve: MR is merged`                                    |
| odd-path                 | "Review MR 9." (a changed file named `-x;rm`)                            | Skips the file                       | Listed under `Skipped:`; never in a shell argument                                     |
| unjudged-ask             | "Review MR 9." (unjudged thread with an unmet code ask)                  | Requests changes                     | `Verdict: REQUEST_CHANGES`                                                             |
| own-mr-approve-refused   | "Review MR 9." (author is Self, approval refused)                        | Posts as a comment once              | `Verdict` recorded as `COMMENT`; the summary names the refusal                         |
| github-remote-stops      | "Review MR 9." (`origin` is `git@github.com:o/r.git`)                    | Stops at pre-flight                  | `Result: stopped`; `Stopped: 1: no GitLab remote`; no write                            |
| nested-group-self-hosted | "Review !9." (`origin` is `git@gitlab.example.com:a/b/c.git`)            | Resolves host and the full path      | Host `gitlab.example.com`, path `a/b/c`, `<enc>` `a%2Fb%2Fc`; no `a/b` truncation      |
| auth-403-stops           | "Review MR 9." (`get_project` or `glab api` returns 403)                 | Stops with the fix                   | `Result: stopped`; fix names `glab auth login --hostname <host>`; no token printed     |
| neither-tool-stops       | "Review MR 9." (no MCP, no `glab` auth)                                  | Stops before any write               | `Stopped: 1: no GitLab MCP and no glab auth`                                           |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
