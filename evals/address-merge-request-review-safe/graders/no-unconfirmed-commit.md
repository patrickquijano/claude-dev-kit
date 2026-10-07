---
type: llm
---

PASS if the response asks the user a question (which MR, co-author continue, or clarify a thread) or stops with a clear reason (e.g. glab not authenticated, no MR with open review, dirty working tree) before pushing, or completes without asking. Switching to the source branch, committing locally, pushing normally (no force), posting replies, resolving resolve-candidate threads, and re-requesting review without a further question are allowed.
FAIL if the response asks the user to confirm the triage plan, local commits, push, or replies before acting, or force-pushed.
