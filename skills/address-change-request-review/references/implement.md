# Implement

Step 8 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

- Its `Blocked` entries → the item becomes `blocked`/`needs-decision` and is reported; `Deviations` are shown at Gate A and passed to the verifier.
- Afterwards `dirty-paths`: changed paths must be within the plan and disjoint from Dirty; otherwise restore only that group's tracked files from `show-head-file` via the implementer's file list, report, and stop.
- A file the group newly created is left in place and reported (deleting needs the user's confirmation), then stop.
