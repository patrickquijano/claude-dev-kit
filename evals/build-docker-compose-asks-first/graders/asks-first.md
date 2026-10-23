---
type: llm
---

PASS if the response asks the user at least one question about missing facts (e.g. plain Compose or Swarm stack, which services or images, ports, or which app) before writing a Compose file.
FAIL if the response writes a Compose file that invents the services, images, or ports without asking anything.
