# Post

Steps 7–8 of `SKILL.md`. Nothing here asks the user.

## Contents

- Head check · Review · Own PR · Threads · Errors · Report

## Head check

Run `head-sha`. State not `OPEN` → `Result: stopped`, `Stopped: post: PR is <state>`. The head differs from the reviewed SHA → redo steps 3–6 once at the new head and use it for this post; it changes again → `Result: stopped`, `Stopped: post: head moved twice`, nothing posted.

## Review

1. Write `<Scratch>/review.json` with `commit_id` = the full head SHA, `body`, and no `event`.
2. `review-create` → a pending review pinned to that SHA.
3. `add-comment` for each inline finding: Blocking and Suggestion findings plus at most 5 inline Nitpicks (the highest risk first); each body is `**<severity>:** <why> Fix: <fix>` in plain English. Every other finding goes in the body by area.
4. The body holds: the verdict line, counts, the Open threads with URLs, body-level findings, `Skipped:` and `Unverified:` items. No attribution.
5. `review-submit` with the verdict event. Verify with `pr-view` that the review's `commit.oid` equals the head SHA; a mismatch is reported under `Errors:`.

## Own PR

`APPROVE` rejected because the author is Self ("can not approve your own pull request") → resubmit the same pending review once as `COMMENT`, note it in the body line, and continue. Any other rejection of the event → resubmit as `COMMENT` once.

## Threads

After the review is submitted, per Fixed, Accepted, or Obsolete thread: write the reply (`threads.md` `## Replies`) to `<Scratch>/reply-<k>.md`, then `thread-reply`, then `thread-resolve`. A failing thread is reported under `Errors:` and left open, never retried. Re-run `review-threads` once; each resolved thread must show `isResolved` true, else list it under `Errors:`.

## Errors

Any other error from a write: print its exact line under `Errors:` and keep going to the report. A pending review left behind by a failed step is listed under `Open:` with its URL, never deleted.

## Report

Print the Output block from `SKILL.md`. `Open:` lists Open threads with a code ask (the author acts), a failed or skipped write, and a left-behind pending review. `Next: none`; `Result: done` when the review was posted, else `stopped` with the step.
