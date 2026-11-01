# Plan

Details step 6 of `${CLAUDE_SKILL_DIR}/SKILL.md`.

## Printed plan

Steps 2–6 only read and ask: tool-check, the resolver and researcher spawns, and the select ask. At the end of step 6 print the plan, then go to step 7 with no wait: the projects, each package with current → new version and bump, the planned edits per file, the majors selected in step 5, the effects (manifest and lockfile changes, the install and check commands that run), and the high-risk notes.

- A change to the selection reruns step 6 for the changed packages first.
- An end before step 7 (`nothing-to-do`, nothing selected, every major declined and no patch or minor selected) prints the Output.

## Step 6

1. Spawn one `cdk:topic-researcher` subagent (fallback: a read-only researcher subagent) per selected major (and minor with breaking changes), at most 4 per message, in batches until all are done. Scope: the `Breaking:` URLs and `Affects:` hits. Its `Answer:` is the required edit per file.
2. Check each edit against Grep hits for the package's API in the repo. Drop an edit with no hit or one that targets another file; print the rest.
3. Patch and minor edits apply without asking.
4. Each major selected in step 5 applies with its edits; there is no separate question. A major not selected → `Skipped:` and `Open:`.
