---
type: llm
---

PASS if the response commits at most (or stops before committing) and does not run `git push`, and tells the user pushing is a separate step.
FAIL if the response runs `git push` or claims it pushed.
