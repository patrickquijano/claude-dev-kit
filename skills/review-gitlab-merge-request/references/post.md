# Post

Steps 8–9 of `SKILL.md`. The only question is the Confirm below; everything after it runs without asking.

## Contents

- Confirm · Head check · Threads · Review · Own MR · Errors · Report

## Confirm

Before any write, print the verdict, the coverage, the finding counts, the inline and body split, and the thread writes planned: replies (addressed, not addressed) and resolves. AskUserQuestion once: **Post** (submits the thread writes and the review; Recommended when every area completed) · **Stop** (`Result: cancelled`, `Review: not posted (declined)`, nothing written). Any `Skipped` file, incomplete area, incomplete sweep, or coverage gap makes Stop Recommended, with that as the reason. No way to ask → `Result: stopped`, `Stopped: post: unattended, not confirmed`, `Review: not posted (unattended)`; interactive without AskUserQuestion → ask as plain text and end the turn.

## Head check

Run `head-sha`. State not `opened` → `Result: stopped`, `Stopped: post: MR is <state>`. The head differs from the reviewed SHA → redo steps 3–7 once at the new head and use it for this post; it changes again → `Result: stopped`, `Stopped: post: head moved twice`, nothing posted.

## Threads

Right after the head check and before the review: per judged thread, write the reply (`threads.md` `## Replies`) to `<Scratch>/reply-<k>.md`, then `thread-reply`; then `thread-resolve` only when the state is Fixed, Accepted, or Obsolete and `resolvable` is true (opened by the MR author or Self). Open threads are replied to and never resolved; unjudged threads get nothing. A failing thread write is reported under `Errors:` and left as is, never retried. Re-run `review-threads` once; each resolved thread must show `resolved` true, else list it under `Errors:`.

## Review

GitLab has no pending review to pin: the head check above is the pin, and every inline comment carries the head SHA.

1. Write `<Scratch>/review.md` (the summary) with the verdict line, the `Coverage:` line, counts, the Open threads with URLs, body-level findings, and `Skipped:` and `Unverified:` items. No attribution, and no line starting with `/`.
2. Verdict `APPROVE` → run `approve` with the full head SHA first; a refusal follows `## Own MR`.
3. `review-post` (glab fallback: `inline-comment` per comment, then `review-summary`): inline comments for Blocking and Suggestion findings plus at most 5 inline Nitpicks (the highest risk first); each body is `**<severity>:** <why> Fix: <fix>` in plain English. Every other finding goes in the summary by area. MCP posts at most 20 comments per call: split them, and send the summary and verdict only with the last call. The summary begins with the verdict word `REQUEST_CHANGES`, `COMMENT`, or `APPROVE`.
4. Run `head-sha` once more; a head that differs from the posted SHA is reported under `Errors:`. For `APPROVE`, the approval is verified through `mr-view`; a missing approval is reported under `Errors:`.

## Own MR

`APPROVE` refused because the author is Self (GitLab does not allow approving your own merge request when that setting applies) → post the same review once as `COMMENT`, note it in the summary line, and continue. Any other refusal of the approval (permission, rules) → post once as `COMMENT`.

## Errors

Any other error from a write: print its exact line under `Errors:` and keep going to the report. A summary or inline comment already posted when a later step fails is listed under `Open:` with its URL, never deleted.

## Report

Print the Output block from `SKILL.md`; the review URL is the summary note's `<mr url>#note_<id>`. `Open:` lists Open threads with a code ask (the author acts), a failed or skipped write, and a partly posted review. `Next: none`; `Result: done` when the review was posted, else `stopped` with the step.
