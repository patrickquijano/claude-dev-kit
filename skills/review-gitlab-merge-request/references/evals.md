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

| id                         | prompt                                                                   | expected                             | pass                                                                                                |
| -------------------------- | ------------------------------------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| clean-mr                   | "Review MR 9." (no findings, pipeline green, complete)                   | Asks Post or Stop, then approves     | One confirm before any write; `Verdict: APPROVE`; approve carries the head SHA                      |
| approve-with-nits          | "Review MR 9." (only Suggestions and Nitpicks, pipeline green, complete) | Approves, posts them as non-blocking | `Verdict: APPROVE`; the items appear in the review                                                  |
| open-thread-reply          | "Review MR 9." (a thread opened by the author, change still missing)     | Replies, does not resolve            | Reply `Not addressed at <sha>`; discussion stays unresolved                                         |
| gate-still-reviews         | "Review MR 9." (one judged Open thread)                                  | Still runs the full analysis         | 4 reviewers plus the sweep run; `Verdict: REQUEST_CHANGES`; findings posted next to the open thread |
| coverage-gap-respawn       | "Review MR 9." (an area omits a changed file from its `Coverage:`)       | Respawns that area once              | The area is respawned once for the missing file; none left unreviewed                               |
| repeated-pattern-all-sites | "Review MR 9." (the same bug at 3 sites)                                 | Reports every site                   | 3 sites reported in one review                                                                      |
| large-diff-batched         | "Review MR 9." (a 5,000-line diff)                                       | Splits into batches                  | 2 batches; nothing under `Skipped:`                                                                 |
| oversize-file-own-batch    | "Review MR 9." (one changed file of 3,500 lines)                         | Forms its own batch                  | The file is alone in its `batch-<n>.txt`; nothing under `Skipped:`                                  |
| context-fetch              | "Review MR 9." (a reviewer returns `Need:` with one path)                | Fetches once, respawns the area once | Path fetched once into `<Scratch>/head/`; area respawned once (cap 1)                               |
| sweep-unavailable          | "Review MR 9." (the sweep spawn fails or returns malformed twice)        | Sweeps inline                        | Inline sweep runs once per batch; noted under `Errors:`                                             |
| sweep-unfinished           | "Review MR 9." (the sweep and its inline fallback both fail)             | Partial sweep; verdict COMMENT       | Failure noted under `Errors:`; `Verdict: COMMENT`; Stop Recommended                                 |
| over-4-batches             | "Review MR 9." (a diff beyond 4 batches)                                 | Partial coverage; verdict COMMENT    | 4 batches reviewed by `## Priority`; `Skipped:` lists the rest; `Verdict: COMMENT`                  |
| declined                   | "Review MR 9." (user picks Stop)                                         | Writes nothing                       | `Result: cancelled`; `Review: not posted (declined)`                                                |
| foreign-thread             | "Review MR 9." (a fixed thread opened by a third person)                 | Replies, does not resolve            | Reply left for the opener; listed under `Open:`; no resolve                                         |
| closed-mr                  | "Review MR 9." (merged)                                                  | Stops                                | `Result: stopped`; `Stopped: resolve: MR is merged`                                                 |
| odd-path                   | "Review MR 9." (a changed file named `-x;rm`)                            | Skips the file                       | Listed under `Skipped:`; never in a shell argument                                                  |
| unjudged-ask               | "Review MR 9." (unjudged thread with an unmet code ask)                  | Requests changes                     | `Verdict: REQUEST_CHANGES`                                                                          |
| own-mr-approve-refused     | "Review MR 9." (author is Self, approval refused)                        | Posts as a comment once              | `Verdict` recorded as `COMMENT`; the summary names the refusal                                      |
| github-remote-stops        | "Review MR 9." (`origin` is `git@github.com:o/r.git`)                    | Stops at pre-flight                  | `Result: stopped`; `Stopped: 1: no GitLab remote`; no write                                         |
| nested-group-self-hosted   | "Review !9." (`origin` is `git@gitlab.example.com:a/b/c.git`)            | Resolves host and the full path      | Host `gitlab.example.com`, path `a/b/c`, `<enc>` `a%2Fb%2Fc`; no `a/b` truncation                   |
| auth-403-stops             | "Review MR 9." (`get_project` or `glab api` returns 403)                 | Stops with the fix                   | `Result: stopped`; fix names `glab auth login --hostname <host>`; no token printed                  |
| neither-tool-stops         | "Review MR 9." (no MCP, no `glab` auth)                                  | Stops before any write               | `Stopped: 1: no GitLab MCP and no glab auth`                                                        |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
