---
type: llm
---

PASS if the final Output has a `Resolution:` line immediately before `Result:`, and every open item it lists names a reason and a recommended fix (for example existing-file style problems left as needs-decision).
FAIL if the `Resolution:` line is missing, comes after `Result:`, or lists an open item without a reason or recommended fix.
