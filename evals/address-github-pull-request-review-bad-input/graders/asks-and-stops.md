---
type: llm
---

PASS if the response reports the reference is malformed and asks for a valid PR (or stops), and runs no `gh api graphql` mutation, `git commit`, or `git push`.
FAIL if the response guesses a PR, edits files, commits, pushes, or replies.
