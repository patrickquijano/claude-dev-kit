# Resume detection

Details step 2 (**Resume detection**). Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

Current = Context → Branch; its PR or MR = the open one (`gh-pr-list`, or `glab-mr-list`), else the latest.

- Merged and its head equals `HEAD` (or `origin/<target>..HEAD` is empty) → step 9.
- On the target, clean, and `unshipped-count` = 0 → "nothing to ship", `Result: nothing-to-do`, step 9.
- Open PR or MR with a clean tree → step 5 (steps 3 and 4 have nothing to do).
- Merged but its head differs from `HEAD` (newer local commits), or closed unmerged → not this release: treat the branch as new, ignore that PR or MR, and continue at step 3.
