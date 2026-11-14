# Evals

Cases for `review-gitlab-merge-request`: own-discussion handling, re-review, verdicts, remote parsing, and guards. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id | prompt | expected | pass |
| --- | --- | --- | --- |
| clean-mr | "Review MR 9." (no findings, pipeline green, complete) | Posts the summary note and approves with no confirmation | `Verdict: APPROVE`; one marked summary note; approve carries the head SHA; no question before any write |
| approve-with-nits | "Review MR 9." (only nit and question findings, pipeline green, complete) | Approves, posts them as non-gating discussions | `Verdict: APPROVE`; the items are marked `[nit]` or `[question]` discussions and never gate |
| open-thread-still-reviews | "Review MR 9." (one own gating discussion judged Open) | Still runs the full analysis | 4 reviewers plus the sweep run; `Verdict: REQUEST_CHANGES`; a first review also posts new discussions |
| coverage-gap-respawn | "Review MR 9." (an area omits a changed file from its `Coverage:`) | Respawns that area once | The area is respawned once for the missing file; none left unreviewed |
| coverage-gap-inline | "Review MR 9." (an area still omits a file after its respawn) | Reviews the file inline | File reviewed inline; noted under `Errors:`; not a coverage gap |
| repeated-pattern-all-sites | "Review MR 9." (the same bug at 3 sites) | Reports every site | 3 sites reported, inline or body, in one review |
| large-diff-batched | "Review MR 9." (a 5,000-line diff) | Splits into batches | 2 batches; nothing under `Skipped:` |
| oversize-file-own-batch | "Review MR 9." (one changed file of 3,500 lines) | Forms its own batch | The file is alone in its `batch-<n>.txt`; nothing under `Skipped:` |
| context-fetch | "Review MR 9." (a reviewer returns `Need:` with one path) | Fetches once, respawns the area once | Path fetched once into `<Scratch>/head/`; area respawned once (cap 1) |
| need-fetch-fails | "Review MR 9." (a `Need:` path fails to fetch) | Skips the path, respawns once | Path listed under `Skipped:`; area respawned once; no retry |
| sweep-unavailable | "Review MR 9." (the sweep spawn fails or returns malformed twice) | Sweeps inline | Inline sweep runs once per batch; noted under `Errors:` |
| sweep-unfinished | "Review MR 9." (the sweep and its inline fallback both fail) | Partial sweep; verdict COMMENT | Failure noted under `Errors:`; `Verdict: COMMENT` |
| sweep-partial-covered | "Review MR 9." (the sweep `Covered:` misses a batch path) | Respawns once, then inline | Sweep respawned once, then run inline; noted under `Errors:` |
| over-4-batches | "Review MR 9." (a diff beyond 4 batches) | Partial coverage; verdict COMMENT | 4 batches reviewed by `## Priority`; `Skipped:` lists the rest; `Verdict: COMMENT` |
| closed-mr | "Review MR 9." (merged) | Stops | `Result: stopped`; `Stopped: resolve: MR is merged` |
| odd-path | "Review MR 9." (a changed file named `-x;rm`) | Skips the file | Listed under `Skipped:`; never in a shell argument |
| github-remote-stops | "Review MR 9." (`origin` is `git@github.com:o/r.git`) | Stops at pre-flight | `Result: stopped`; `Stopped: 1: no GitLab remote`; no write |
| nested-group-self-hosted | "Review !9." (`origin` is `git@gitlab.example.com:a/b/c.git`) | Resolves host and the full path | Host `gitlab.example.com`, path `a/b/c`, `<enc>` `a%2Fb%2Fc`; no `a/b` truncation |
| auth-403-stops | "Review MR 9." (`get_project` or `glab api` returns 403) | Stops with the fix | `Result: stopped`; fix names `glab auth login --hostname <host>`; no token printed |
| neither-tool-stops | "Review MR 9." (no MCP, no `glab` auth) | Stops before any write | `Stopped: 1: no GitLab MCP and no glab auth` |
| no-approval-step | "Review MR 9." | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; no question is asked; each side-effect step runs directly |
| reviewer-agent-kind | "Review MR 9." (any diff) | Spawns the dedicated reviewer once per area | Four `cdk:code-reviewer` spawns, one per area kind; no other subagent type |
| own-open-thread-untouched | "Review MR 9." (re-review; an own `[major]` discussion, change still missing) | Leaves it open, adds nothing | No reply, no resolve, no new note; `Verdict: REQUEST_CHANGES`; own approval removed if present |
| foreign-thread-ignored | "Review MR 9." (an open discussion by another reviewer, or by Self without the marker) | Ignores it entirely | Not judged, replied to, or resolved; counted under `ignored` |
| unjudged-gating | "Review MR 9." (own `[minor]` discussion, no change since) | Keeps changes requested | `Verdict: REQUEST_CHANGES`; discussion untouched |
| re-review-resolves | "Review MR 9." (re-review; an own `[major]` discussion now fixed at the head) | Resolves it with no reply, edits the summary in place | `thread-resolve` ran; `summary-update` ran; no `summary-post`; approves when no gating discussion is left |
| re-review-new-findings | "Review MR 9." (re-review; the delta has one minor and one critical issue) | Adds only the critical discussion | Only the `[critical]` discussion is posted; the minor is dropped as `re-review`; scratch diff from `compare-diff` |
| already-approved | "Review MR 9." (own approval, no commits since the last reviewed SHA) | Stops | `already approved`; `Result: nothing-to-do`; nothing posted |
| approved-new-commits | "Review MR 9." (own approval, new commits since) | Runs a first review | Mode `first review`; a new marked summary note |
| author-dispute | "Review MR 9." (the author replied disputing an own discussion) | Does not resolve | Listed under `Open:` as disputed; discussion stays open |
| cannot-edit-summary | "Review MR 9." (re-review; no `glab`, or `summary-update` fails) | Stops | `Stopped: post: cannot edit summary`; no new summary note |
| own-mr | "Review MR 9." (the MR is Self's, approval refused) | Posts no approval | Summary states changes are requested through the unresolved discussions or the approval refusal; no approval write; discussions untouched |
| no-request-changes | "Review MR 9." (a kept `[critical]` finding, own approval present) | Expresses changes requested without a review state | Own approval removed (`unapprove`); the summary says changes are requested through the unresolved discussions |
| comment-format | "Review MR 9." (any finding) | Labels every comment | Each body starts with `[severity]`, has problem, impact, fix, ends with the marker, and has no line starting with `/`; no other label |
| thread-judge-uncertain | "Review MR 9." (an own discussion the judge cannot place) | Judge returns Open | `cdk:code-reviewer` kind `threads` returns `Open` for that discussion; it stays open with nothing added |
| not-trigger-address | "Address the review comments on MR 9." | Does not trigger; address-gitlab-merge-request-review handles it | This skill is not invoked; no GitLab write |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
