# Post

Steps 8–10 of `SKILL.md`. Nothing is asked here; every write runs without waiting. Every posted comment and the summary carry the marker; every new discussion body is `[severity] <problem>. <impact>. <fix>.` in plain English with no `Impact:` or `Fix:` label and no line starting with `/` (GitLab reads it as a quick action), a blank line, then the marker. The severity prefix is for discussions only; the summary has none. Example body: `[major] parseDate drops the UTC offset. Late orders land on the wrong day. Parse with the offset-aware parser.`

## Contents

- Summary · Head check · Threads · Summary note · State · Own MR · Fix loop · Nit pass · Errors · Report

## Summary

Before any write, print the mode, the verdict, the coverage, the finding counts, the new discussions, and the resolves planned. Then post without waiting; a `Skipped` file, incomplete area, incomplete sweep, or coverage gap is listed under `Open:`.

## Head check

Run `head-sha`. State not `opened` → `Result: stopped`, `Stopped: 8: MR is <state>`. The head differs from the reviewed SHA → redo steps 3–7 once at the new head and use it for this post; it changes again → `Result: stopped`, `Stopped: 8: head moved twice`, nothing posted.

Then run `approvals`. `REQUEST_CHANGES` with an own approval present → `unapprove`. `COMMENT` (a hold) with an own approval present → `unapprove` too; with none, no approval write. The revoke runs before any other write, so a later stop never leaves a stale approval on an MR with new gating discussions.

## Threads

Right after the head check and revoke: `thread-resolve` for each own gating discussion judged Fixed or Obsolete, with no reply. Open and unjudged discussions get nothing added; disputed discussions are listed under `Open:` and never resolved. A failing resolve → `Result: stopped`, `Stopped: 8: cannot resolve discussion <id>` with the exact error; never post a replacement note. Re-run `review-threads` once; each resolved discussion must show `resolved` true, else stop the same way.

## Summary note

Write `<Scratch>/summary.md` with the verdict line, the `Coverage:` line, counts per severity, the unresolved own gating discussions with URLs, summary-level findings, the re-review `Dropped:` items, `Skipped:` and `Unverified:` items, a `Last reviewed SHA: <full head SHA>` line, and the marker. No attribution, and no line starting with `/`. When the verdict is `REQUEST_CHANGES`, it states that changes are requested through the unresolved discussions, because GitLab has no request-changes review. When the verdict is `APPROVE` and the author is Self, it states that approval is not possible.

- First review: `summary-post` once, after the new discussions are posted (see below).
- Re-review: `summary-update` on the own summary note's id (counts, verdict, last reviewed SHA). Never `summary-post`. No `glab`, or an update that fails → `Result: stopped`, `Stopped: 8: cannot edit summary` with the exact error; post nothing further.

## State

The state is the discussions plus the approval:

1. New discussions: `review-post` (glab fallback: `inline-comment` per comment) for the `critical`, `major`, and `minor` findings plus at most 5 inline non-blocking `nit` or `question` findings (highest severity first); MCP posts at most 20 per call, so split them. Every other finding goes in the summary. A re-review posts only new `critical`, `major`, and `minor` discussions; `APPROVE` carries no gating findings, only the non-gating `nit` and `question` discussions of a first review.
2. Post or edit the summary (above), then run `head-sha` once more; a head that differs from the posted SHA is reported under `Errors:`.
3. Last, `APPROVE` → `approve` with the full head SHA (a refusal follows `## Own MR`), then verify the approval through `approvals`; a missing approval is reported under `Errors:`.

## Own MR

`APPROVE` refused because the author is Self (GitLab does not allow approving your own merge request when that setting applies) → the approval runs last, after the summary is posted, so the summary states it up front when the author is Self. Leave the discussions as they are and continue with no approval. Any other refusal of the approval (permission, rules) → report it under `Errors:`.

## Fix loop

Runs only when step 8g invoked the address skill; at most 3 rounds (`SKILL.md` Caps).

- Guard: continue only when its Output has `Result: done` and `Pushed: <source branch> @ <short sha>`; `not pushed`, no commit, or `stopped` → no re-review, nothing written, and the open discussions go under `Open:`.
- Re-judge: `head-sha`, then redo steps 3a–3c (`threads.md`) at the new head over the own discussions this run posted. First-review kinds, the sweep, and new discussions never run, so no new finding enters.
- Update order: `thread-resolve` each discussion judged Fixed or Obsolete (`## Threads` rules), then edit the summary note (counts, verdict), then the state (`approve` only when no gating discussion is left, per `## State`; a verdict that is not `APPROVE` with an own approval present → `unapprove` first). Leave `Last reviewed SHA:` as it was, so a later run still reviews the fix commits.
- Head check: reuse `## Head check`, one redo of steps 3a–3c only; a head that moves again → `Result: stopped`, `Stopped: 9: head moved twice`.
- Loop: continue to step 8g only when the gating count fell below the previous round's and fewer than 3 rounds ran; otherwise stop and list what is open under `Open:`.

## Nit pass

Runs only at step 9b: verdict `APPROVE` and own open `[nit]` or `[question]` discussions, with the step 8g checkout guards. The address skill is invoked once with `--nits-only`; continue only when its Output has `Result: done`, else nothing is written and the discussions go under `Open:`. The fix is pushed with no re-review, no resolve, no summary or approval edit, and `Last reviewed SHA:` unchanged. Known limit: the address skills skip the summary note, so a `nit` or `question` beyond the inline cap of 5 (summary-only) is not fixed and stays listed in the summary. The push may make the host dismiss the approval (stale-approval setting); say so under `Open:`.

## Errors

A failed resolve or summary edit stops (see above). Any other error from a write: print its exact line under `Errors:` and keep going to the report. A discussion or note already posted when a later step fails is listed under `Open:` with its URL, never deleted. A stop after the revoke never restores the approval.

## Report

Print the Output block from `SKILL.md`; the review URL is the summary note's `<mr url>#note_<id>`. `Open:` lists disputed discussions (the user decides), unresolved own gating discussions (the author acts), a failed or skipped write, and a partly posted review. `Next: none`; `Result: done` when the writes completed, else `stopped` with the step.
