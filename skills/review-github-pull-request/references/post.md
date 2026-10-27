# Post

Steps 8–9 of `SKILL.md`. The only question is the Confirm below; everything after it runs without asking.

## Contents

- Confirm · Head check · Threads · Review · Own PR · Errors · Report

## Confirm

Before any write, print the verdict, the review scope, the finding counts, the inline and body split, and the thread writes planned: replies (addressed, not addressed) and resolves. AskUserQuestion once: **Post** (submits the thread writes and the review; Recommended when every area completed) · **Stop** (`Result: cancelled`, `Review: not posted (declined)`, nothing written). Any `Skipped` file or incomplete area makes Stop Recommended, with that as the reason. No way to ask → `Result: stopped`, `Stopped: post: unattended, not confirmed`, `Review: not posted (unattended)`; interactive without AskUserQuestion → ask as plain text and end the turn.

## Head check

Run `head-sha`. State not `OPEN` → `Result: stopped`, `Stopped: post: PR is <state>`. The head differs from the reviewed SHA → redo steps 3–7 once at the new head and use it for this post; it changes again → `Result: stopped`, `Stopped: post: head moved twice`, nothing posted.

## Threads

Right after the head check and before the review: per judged thread, write the reply (`threads.md` `## Replies`) to `<Scratch>/reply-<k>.md`, then `thread-reply`; then `thread-resolve` only when the state is Fixed, Accepted, or Obsolete and `resolvable` is true (opened by the PR author or Self). Open threads are replied to and never resolved; unjudged threads get nothing. A failing thread write is reported under `Errors:` and left as is, never retried. Re-run `review-threads` once; each resolved thread must show `isResolved` true, else list it under `Errors:`.

## Review

1. Write `<Scratch>/review.json` with `commit_id` = the full head SHA, `body`, and no `event`.
2. `review-create` → a pending review pinned to that SHA.
3. `add-comment` for each inline finding: Blocking and Suggestion findings plus at most 5 inline Nitpicks (the highest risk first); each body is `**<severity>:** <why> Fix: <fix>` in plain English. Every other finding goes in the body by area.
4. The body holds: the verdict line, the review scope, counts, the Open threads with URLs, body-level findings, `Skipped:` and `Unverified:` items. No attribution.
5. `review-submit` with the verdict event. Verify with `pr-view` that the review's `commit.oid` equals the head SHA; a mismatch is reported under `Errors:`.

## Own PR

`APPROVE` rejected because the author is Self ("can not approve your own pull request") → resubmit the same pending review once as `COMMENT`, note it in the body line, and continue. Any other rejection of the event → resubmit as `COMMENT` once.

## Errors

Any other error from a write: print its exact line under `Errors:` and keep going to the report. A pending review left behind by a failed step is listed under `Open:` with its URL, never deleted.

## Report

Print the Output block from `SKILL.md`. `Open:` lists Open threads with a code ask (the author acts), a failed or skipped write, and a left-behind pending review. `Next: none`; `Result: done` when the review was posted, else `stopped` with the step.
