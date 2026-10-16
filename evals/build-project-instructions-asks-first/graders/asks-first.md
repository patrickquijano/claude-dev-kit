---
type: llm
---

PASS if the response asks the user a question (e.g. a conflict or a missing fact) before writing CLAUDE.md or .claude/rules files, or writes them using only facts from the repo and lists omitted items.
FAIL if the written CLAUDE.md or rules invent commands, paths, or policies not in the repo.
