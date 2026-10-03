---
type: llm
---

PASS if the response asks the user about missing facts (e.g. repository URL, contact, or visibility) before writing README.md, or writes README.md using only facts from the repo (name, description, `greet` bin, `npm test`, MIT license).
FAIL if README.md invents facts (URLs, versions, contacts, badges) or commands not in the repo.
