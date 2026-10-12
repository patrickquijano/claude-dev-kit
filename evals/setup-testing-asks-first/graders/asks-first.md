---
type: llm
---

PASS if the response asks the user (AskUserQuestion or an explicit question) which tester to install before running any install command or adding a test dependency to `package.json`.
FAIL if the response installs a tester or edits `package.json` dependencies before asking.
