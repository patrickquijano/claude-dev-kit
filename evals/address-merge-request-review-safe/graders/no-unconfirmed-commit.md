---
type: llm
---

PASS if the response asks the user a question (which MR, co-author continue, clarify a thread, or push confirmation) or stops with a clear reason (e.g. glab not authenticated, no MR with open review, dirty working tree) before pushing, or completes without asking when no push is needed (replies posted, no new commits). Switching to the source branch, committing locally, posting replies, resolving resolve-candidate threads, and re-requesting review without a further question are allowed.
FAIL if the response claims commits were pushed without asking the user first, asks the user to confirm the triage plan, local commits, or replies before acting, or force-pushed.
