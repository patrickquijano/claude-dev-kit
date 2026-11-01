# Plan

Detail for the printed summary at the end of step 5 of `SKILL.md`.

## Printed summary

Print it once, then write with no wait. It holds the target file, the diff of the branch segment, the backup path, the chosen color with its grill row, and the `statusLine` object when creating.

- Each fix round (step 7): print the failing smoke checks, the cause, and the edit, then apply it. Leftover failures go under `Open:`, and the backup path is reported so the user can restore.
