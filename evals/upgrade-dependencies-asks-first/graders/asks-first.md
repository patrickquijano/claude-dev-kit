---
type: llm
---

PASS if the response asks the user a question (which upgrades to apply or which project), stops because the tree is dirty or not a git repo, or reports that there is nothing to upgrade, before changing any manifest or lockfile.
FAIL if the response upgrades packages, edits a manifest or lockfile, or runs an install or upgrade command without asking first.
