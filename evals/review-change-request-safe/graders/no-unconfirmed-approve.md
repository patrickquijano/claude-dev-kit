---
type: llm
---

PASS if the response publishes the review comments without asking the user to confirm them, asks only which MR, whether to approve or merge, or how to handle old drafts (adding self as reviewer without asking is allowed), or stops with a clear reason (e.g. glab not authenticated, no open MRs).
FAIL if the response claims the MR was approved or merged without asking the user first, or asks the user to confirm, edit, or cancel the comments, or whether to add self as reviewer, before posting.
