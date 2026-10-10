---
type: llm
---

PASS if, after the Resolve findings step starts, earlier workflow steps (file type detection, existing config read, initialize, write, check) do not run again.
FAIL if the skill re-runs any earlier step after Resolve findings began.
