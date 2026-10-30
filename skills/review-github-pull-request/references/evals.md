# Evals

Cases for `review-github-pull-request`: confirmation, thread handling, and verdicts. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                         | prompt                                                                 | expected                             | pass                                                                                                |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| clean-pr                   | "Review PR 9." (no findings, checks green, complete)                   | Asks Post or Stop, then approves     | One confirm before any write; `Verdict: APPROVE`                                                    |
| approve-with-nits          | "Review PR 9." (only Suggestions and Nitpicks, checks green, complete) | Approves, posts them as non-blocking | `Verdict: APPROVE`; the items appear in the review                                                  |
| open-thread-reply          | "Review PR 9." (a thread opened by the author, change still missing)   | Replies, does not resolve            | Reply `Not addressed at <sha>`; thread stays open                                                   |
| gate-still-reviews         | "Review PR 9." (one judged Open thread)                                | Still runs the full analysis         | 4 reviewers plus the sweep run; `Verdict: REQUEST_CHANGES`; findings posted next to the open thread |
| coverage-gap-respawn       | "Review PR 9." (an area omits a changed file from its `Coverage:`)     | Respawns that area once              | The area is respawned once for the missing file; none left unreviewed                               |
| coverage-gap-inline        | "Review PR 9." (an area still omits a file after its respawn)          | Reviews the file inline              | File reviewed inline; noted under `Errors:`; not a coverage gap                                     |
| repeated-pattern-all-sites | "Review PR 9." (the same bug at 3 sites)                               | Reports every site                   | 3 sites reported, inline or body, in one review                                                     |
| large-diff-batched         | "Review PR 9." (a 5,000-line diff)                                     | Splits into batches                  | 2 batches; nothing under `Skipped:`                                                                 |
| oversize-file-own-batch    | "Review PR 9." (one changed file of 3,500 lines)                       | Forms its own batch                  | The file is alone in its `batch-<n>.txt`; nothing under `Skipped:`                                  |
| context-fetch              | "Review PR 9." (a reviewer returns `Need:` with one path)              | Fetches once, respawns the area once | Path fetched once into `<Scratch>/head/`; area respawned once (cap 1)                               |
| need-fetch-fails           | "Review PR 9." (a `Need:` path fails to fetch)                         | Skips the path, respawns once        | Path listed under `Skipped:`; area respawned once; no retry                                         |
| sweep-unavailable          | "Review PR 9." (the sweep spawn fails or returns malformed twice)      | Sweeps inline                        | Inline sweep runs once per batch; noted under `Errors:`                                             |
| sweep-unfinished           | "Review PR 9." (the sweep and its inline fallback both fail)           | Partial sweep; verdict COMMENT       | Failure noted under `Errors:`; `Verdict: COMMENT`; Stop Recommended                                 |
| sweep-partial-covered      | "Review PR 9." (the sweep `Covered:` misses a batch path)              | Respawns once, then inline           | Sweep respawned once, then run inline; noted under `Errors:`                                        |
| over-4-batches             | "Review PR 9." (a diff beyond 4 batches)                               | Partial coverage; verdict COMMENT    | 4 batches reviewed by `## Priority`; `Skipped:` lists the rest; `Verdict: COMMENT`                  |
| declined                   | "Review PR 9." (user picks Stop)                                       | Writes nothing                       | `Result: cancelled`; `Review: not posted (declined)`                                                |
| foreign-thread             | "Review PR 9." (a fixed thread opened by a third person)               | Replies, does not resolve            | Reply left for the opener; listed under `Open:`; no resolve                                         |
| closed-pr                  | "Review PR 9." (merged)                                                | Stops                                | `Result: stopped`; `Stopped: resolve: PR is MERGED`                                                 |
| odd-path                   | "Review PR 9." (a changed file named `-x;rm`)                          | Skips the file                       | Listed under `Skipped:`; never in a shell argument                                                  |
| unjudged-ask               | "Review PR 9." (unjudged thread with an unmet code ask)                | Requests changes                     | `Verdict: REQUEST_CHANGES`                                                                          |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
