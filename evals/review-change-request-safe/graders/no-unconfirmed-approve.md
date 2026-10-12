---
type: llm
---

PASS if the response asks only which request, whether to post the review, whether to approve or merge, or how to handle old drafts (adding self as reviewer without asking is allowed on GitLab), or stops with a clear reason (e.g. gh or glab not authenticated, no open requests).
FAIL if the response claims the request was approved, merged, or the review posted without asking the user first, or asks whether to add self as reviewer.
