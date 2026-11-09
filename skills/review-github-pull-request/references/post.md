# Post

Steps 8–9 of `SKILL.md`. Nothing is asked here; every write runs without waiting. Every posted comment and the summary carry the marker; every new thread body is `[severity] <problem> Impact: <impact> Fix: <fix>`, a blank line, then the marker.

## Contents

- Pre-post report · Head check · Threads · Summary comment · State review · Own PR · Errors · Report

## Pre-post report

Before any write, print the mode, the verdict, the coverage, the finding counts, the new threads, and the resolves planned. Then post without waiting; a `Skipped` file, incomplete area, incomplete sweep, or coverage gap is listed under `Open:`.

## Head check

Run `head-sha`. State not `OPEN` → `Result: stopped`, `Stopped: post: PR is <state>`. The head differs from the reviewed SHA → redo steps 3–7 once at the new head and use it for this post; it changes again → `Result: stopped`, `Stopped: post: head moved twice`, nothing posted.

## Threads

Right after the head check: `thread-resolve` for each own gating thread judged Fixed or Obsolete, with no reply. Open and unjudged threads get nothing added; disputed threads are listed under `Open:` and never resolved. A failing resolve → `Result: stopped`, `Stopped: post: cannot resolve thread <id>` with the exact error; never post a replacement comment. Re-run `review-threads` once; each resolved thread must show `isResolved` true, else stop the same way.

## Summary comment

Write `<Scratch>/summary.md` with the verdict line, the `Coverage:` line, counts per severity, the unresolved own gating threads with URLs, summary-level findings, `Skipped:` and `Unverified:` items, a `Last reviewed SHA: <full head SHA>` line, and the marker. No attribution.

- First review: `summary-post` once, after the new threads are queued (see below) and before the state review is submitted.
- Re-review: `summary-update` on the own summary's comment id (counts, verdict, last reviewed SHA). Never `summary-post`. An update that fails → `Result: stopped`, `Stopped: post: cannot edit summary` with the exact error; submit nothing further.

## State review

The review is the state: `REQUEST_CHANGES` while any gating thread is unresolved, `APPROVE` when none is and no hold applies, `COMMENT` for a hold (`analyze.md` `## Verdict`). Its body is only the marker; the summary comment is the report.

1. First review: `review-create` (`commit_id` = the full head SHA, `body` = the marker), then `add-comment` for each new thread: `critical`, `major`, and `minor` findings plus at most 5 inline `nit` or `question` findings (highest risk first, so non-blocking noise does not bury gating threads). Every other finding goes in the summary. Post the summary comment, then `review-submit` with the verdict event.
2. Re-review: submit a review only when it carries something GitHub cannot express otherwise: new `critical` or `major` threads (a thread needs a review object; the review keeps the event `REQUEST_CHANGES`), or an `APPROVE` once no gating thread is unresolved. Nothing new and still unresolved → no review; the state stays as it is. `APPROVE` carries no findings.
3. Verify with `pr-view` that the review's `commit.oid` equals the head SHA; a mismatch is reported under `Errors:`.

## Own PR

GitHub rejects `REQUEST_CHANGES` and `APPROVE` on the author's own PR ("can not approve your own pull request"): submit the same pending review once as `COMMENT`, say in the summary that changes are requested through the unresolved threads, and continue. Any other rejection of the event → resubmit as `COMMENT` once.

## Errors

A failed resolve or summary edit stops (see above). Any other error from a write: print its exact line under `Errors:` and keep going to the report. A pending review left behind by a failed step is listed under `Open:` with its URL, never deleted.

## Report

Print the Output block from `SKILL.md`. `Open:` lists disputed threads (the user decides), unresolved own gating threads (the author acts), a failed or skipped write, and a left-behind pending review. `Next: none`; `Result: done` when the writes completed, else `stopped` with the step.
