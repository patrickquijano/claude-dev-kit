# Evals

Cases for `review-github-pull-request`: thread handling and verdicts. Test each on Haiku, Sonnet, and Opus.

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
| clean-pr | "Review PR 9." (no findings, checks green, complete) | Posts the summary and approves with no confirmation | `Verdict: APPROVE`; one marked summary comment; state review body is only the marker; no question before any write |
| approve-with-nits | "Review PR 9." (only nit and question findings, checks green, complete) | Approves, posts them as non-gating threads | `Verdict: APPROVE`; the items are marked `[nit]` or `[question]` threads and never gate |
| own-open-thread-untouched | "Review PR 9." (re-review; an own `[major]` thread, change still missing) | Leaves it open, adds nothing | No reply, no resolve, no new comment; `Verdict: REQUEST_CHANGES` |
| accepted-thread-stays-open | "Review PR 9." (re-review; an own `[major]` thread whose author replied with a reason and left the code unchanged, judged `Accepted` per `threads.md:32`) | Never resolves it, keeps changes requested | No resolve, no reply; `Verdict: REQUEST_CHANGES`; the thread counted under `left open` and listed under `Open:` as accepted by the author |
| open-thread-still-reviews | "Review PR 9." (one own gating thread judged Open) | Still runs the full analysis | 4 reviewers plus the sweep run; `Verdict: REQUEST_CHANGES`; a first review also posts new threads |
| coverage-gap-respawn | "Review PR 9." (an area omits a changed file from its `Coverage:`) | Respawns that area once | The area is respawned once for the missing file; none left unreviewed |
| coverage-gap-inline | "Review PR 9." (an area still omits a file after its respawn) | Reviews the file inline | File reviewed inline; noted under `Errors:`; not a coverage gap |
| repeated-pattern-all-sites | "Review PR 9." (the same bug at 3 sites) | Reports every site | 3 sites reported, inline or body, in one review |
| large-diff-batched | "Review PR 9." (a 5,000-line diff) | Splits into batches | 2 batches; nothing under `Skipped:` |
| oversize-file-own-batch | "Review PR 9." (one changed file of 3,500 lines) | Forms its own batch | The file is alone in its `batch-<n>.txt`; nothing under `Skipped:` |
| context-fetch | "Review PR 9." (a reviewer returns `Need:` with one path) | Fetches once, respawns the area once | Path fetched once into `<Scratch>/head/`; area respawned once (cap 1) |
| need-fetch-fails | "Review PR 9." (a `Need:` path fails to fetch) | Skips the path, respawns once | Path listed under `Skipped:`; area respawned once; no retry |
| sweep-unavailable | "Review PR 9." (the sweep spawn fails or returns malformed twice) | Sweeps inline | Inline sweep runs once per batch; noted under `Errors:` |
| sweep-unfinished | "Review PR 9." (the sweep and its inline fallback both fail) | Partial sweep; verdict COMMENT | Failure noted under `Errors:`; `Verdict: COMMENT` |
| sweep-partial-covered | "Review PR 9." (the sweep `Covered:` misses a batch path) | Respawns once, then inline | Sweep respawned once, then run inline; noted under `Errors:` |
| over-4-batches | "Review PR 9." (a diff beyond 4 batches) | Partial coverage; verdict COMMENT | 4 batches reviewed by `## Priority`; `Skipped:` lists the rest; `Verdict: COMMENT` |
| foreign-thread-ignored | "Review PR 9." (an open thread by another reviewer, or by Self without the marker) | Ignores it entirely | Not judged, replied to, or resolved; counted under `ignored` |
| closed-pr | "Review PR 9." (merged) | Stops | `Result: stopped`; `Stopped: 2: PR is MERGED` |
| odd-path | "Review PR 9." (a changed file named `-x;rm`) | Skips the file | Listed under `Skipped:`; never in a shell argument |
| unjudged-gating | "Review PR 9." (own `[major]` thread, no change since) | Keeps changes requested | `Verdict: REQUEST_CHANGES`; thread untouched |
| no-approval-step | "Review PR 9." | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly |
| reviewer-agent-kind | "Review PR 9." (any diff) | Spawns the dedicated reviewer once per area | Four `cdk:code-reviewer` spawns, one per area kind; no other subagent type |
| re-review-resolves | "Review PR 9." (re-review; an own `[major]` thread now fixed at the head) | Resolves it with no reply, edits the summary in place | `thread-resolve` ran; `summary-update` ran; no `summary-post`; approves when no gating thread is left |
| re-review-new-findings | "Review PR 9." (re-review; the delta has one minor and one critical issue) | Adds only the critical thread | Only the `[critical]` thread is posted; the minor is dropped as `re-review` and listed under `Dropped:` in the summary |
| already-approved | "Review PR 9." (own approval, no commits since the last reviewed SHA) | Stops | `already approved`; `Result: nothing-to-do`; nothing posted |
| approved-new-commits | "Review PR 9." (own approval, new commits since) | Reviews only the delta since the approved SHA | Mode `re-review (last reviewed <short SHA>)`; the scratch diff comes from `compare-diff` from the approved SHA; the existing summary is edited in place, no new one |
| approved-force-push | "Review PR 9." (own approval, the approved SHA is gone after a force-push, or the summary has no `Last reviewed SHA:`) | Falls back to the full diff | The full diff is reviewed; the fallback is noted under `Open:` |
| minor-never-gates | "Review PR 9." (first review; one `minor` finding, checks green, complete) | Posts it as non-gating and approves | `Verdict: APPROVE`; the `[minor]` thread is posted within the 5 non-blocking inline cap; it is never counted as gating |
| legacy-minor-thread | "Review PR 9." (re-review; an own `[minor]` thread from an earlier run is still open) | Treats it as non-gating | Counted under `ignored (not own or non-gating)`; not judged or resolved; `Verdict: APPROVE` when nothing else gates |
| low-confidence-never-gates | "Review PR 9." (a reviewer returns a `major` with `low` confidence or no quoted evidence) | Downgrades it | Posted as `[question]` or listed under `Unverified:`; never gating; `Verdict` is not `REQUEST_CHANGES` because of it |
| author-dispute | "Review PR 9." (the author replied disputing an own thread) | Does not resolve | Listed under `Open:` as disputed; thread stays open |
| cannot-edit-summary | "Review PR 9." (re-review; `summary-update` fails) | Stops | `Stopped: 8: cannot edit summary`; no new summary comment |
| own-pr | "Review PR 9." (the PR is Self's) | Posts COMMENT | State review `COMMENT`; summary says changes are requested through unresolved threads |
| comment-format | "Review PR 9." (any finding) | Labels every new thread comment | Each new thread body starts with `[severity]`, has problem, impact, fix, and ends with the marker; the summary and the review body carry the marker and no severity prefix |
| thread-judge-uncertain | "Review PR 9." (an own thread the judge cannot place) | Judge returns Open | `cdk:code-reviewer` kind `threads` returns `Open` for that thread; the thread stays open with nothing added |
| gitlab-mr-no-trigger | "Review MR !12 on GitLab." | Does not trigger | This skill not invoked |
| local-diff-no-trigger | "Review my uncommitted changes." | Does not trigger | This skill not invoked |
| tool-mcp | "Review PR 9." (GitHub MCP connected; every host op succeeds) | Uses MCP only | `Tool: mcp`; no `gh` command ran |
| tool-gh-fallback | "Review PR 9." (MCP not connected or its calls error) | Falls back to `gh` | `Tool: gh`; each row's Command ran unchanged; `Tool: mcp+gh` when only some calls fell back |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
