# Post

Steps 8–9 of `SKILL.md`. Nothing is asked here; every write runs without waiting. Every posted comment and the summary carry the marker; every new discussion body is `[severity] <problem> Impact: <impact> Fix: <fix>` in plain English with no line starting with `/` (GitLab reads it as a quick action), a blank line, then the marker. Example body: `[major] parseDate drops the UTC offset. Impact: late orders land on the wrong day. Fix: parse with the offset-aware parser.`

## Contents

- Summary · Head check · Threads · Summary note · State · Own MR · Errors · Report

## Summary

Before any write, print the mode, the verdict, the coverage, the finding counts, the new discussions, and the resolves planned. Then post without waiting; a `Skipped` file, incomplete area, incomplete sweep, or coverage gap is listed under `Open:`.

## Head check

Run `head-sha`. State not `opened` → `Result: stopped`, `Stopped: post: MR is <state>`. The head differs from the reviewed SHA → redo steps 3–7 once at the new head and use it for this post; it changes again → `Result: stopped`, `Stopped: post: head moved twice`, nothing posted.

## Threads

Right after the head check: `thread-resolve` for each own gating discussion judged Fixed or Obsolete, with no reply. Open and unjudged discussions get nothing added; disputed discussions are listed under `Open:` and never resolved. A failing resolve → `Result: stopped`, `Stopped: post: cannot resolve discussion <id>` with the exact error; never post a replacement note. Re-run `review-threads` once; each resolved discussion must show `resolved` true, else stop the same way.

## Summary note

Write `<Scratch>/summary.md` with the verdict line, the `Coverage:` line, counts per severity, the unresolved own gating discussions with URLs, summary-level findings, `Skipped:` and `Unverified:` items, a `Last reviewed SHA: <full head SHA>` line, and the marker. No attribution, and no line starting with `/`. When the verdict is `REQUEST_CHANGES`, it states that changes are requested through the unresolved discussions, because GitLab has no request-changes review.

- First review: `summary-post` once, after the new discussions are posted (see below).
- Re-review: `summary-update` on the own summary note's id (counts, verdict, last reviewed SHA). Never `summary-post`. No `glab`, or an update that fails → `Result: stopped`, `Stopped: post: cannot edit summary` with the exact error; post nothing further.

## State

The state is the discussions plus the approval:

1. Run `approvals`. `REQUEST_CHANGES` with an own approval present → `unapprove`. `APPROVE` → `approve` with the full head SHA (a refusal follows `## Own MR`). `COMMENT` (a hold) with an own approval present → `unapprove` too; with none, no approval write.
2. New discussions: `review-post` (glab fallback: `inline-comment` per comment) for the `critical`, `major`, and `minor` findings plus at most 5 inline `nit` or `question` findings (highest risk first); MCP posts at most 20 per call, so split them. Every other finding goes in the summary. A re-review posts only new `critical` and `major` discussions; `APPROVE` carries no gating findings, only the non-gating `nit` and `question` discussions.
3. Post or edit the summary (above), then run `head-sha` once more; a head that differs from the posted SHA is reported under `Errors:`. For `APPROVE`, verify the approval through `approvals`; a missing approval is reported under `Errors:`.

## Own MR

`APPROVE` refused because the author is Self (GitLab does not allow approving your own merge request when that setting applies) → state it in the summary, leave the discussions as they are, and continue with no approval. Any other refusal of the approval (permission, rules) → the same.

## Errors

A failed resolve or summary edit stops (see above). Any other error from a write: print its exact line under `Errors:` and keep going to the report. A discussion or note already posted when a later step fails is listed under `Open:` with its URL, never deleted.

## Report

Print the Output block from `SKILL.md`; the review URL is the summary note's `<mr url>#note_<id>`. `Open:` lists disputed discussions (the user decides), unresolved own gating discussions (the author acts), a failed or skipped write, and a partly posted review. `Next: none`; `Result: done` when the writes completed, else `stopped` with the step.
