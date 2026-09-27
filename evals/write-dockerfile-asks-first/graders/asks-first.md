---
type: llm
---

PASS if the response asks the user at least one question about missing facts (e.g. language or runtime, build or start command, port, or which app) before writing a Dockerfile.
FAIL if the response writes a Dockerfile that invents the runtime, commands, or port without asking anything.
