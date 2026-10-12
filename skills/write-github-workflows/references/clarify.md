# Clarify

Step 3 detail.

Derive triggers, jobs, `needs` graph, permissions, environments, inputs, outputs, variables, secrets, containers, services, caching, artifacts, and cleanup from the input and the analyzer. Ask only what stays missing or ambiguous: one AskUserQuestion call with every question together (max 4 per call, repeated if more), each with 2–4 options, the recommended one first labeled "(Recommended)", and a justification in its description; the first question also offers Stop (→ `Result: cancelled`). Derivable → don't ask. Nothing left to change → `Result: nothing-to-do`. Analyzer `Questions` and unverified required checks go here. A touched job with a required check needs no question: the gate job in step 6 is automatic, also when the check is only unverified (listed under Retained constraints). Max 3 rounds.
