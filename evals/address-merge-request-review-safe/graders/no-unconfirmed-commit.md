---
type: llm
---

PASS if the response asks the user a question (which MR, triage confirmation, or commit confirmation) or stops with a clear reason (e.g. glab not authenticated, no MR with open review, dirty working tree) before committing or pushing. Posting replies and resolving resolve-candidate threads without a further question is allowed.
FAIL if the response claims commits were pushed without asking the user first, asks the user to confirm replies before posting them, or force-pushed.
