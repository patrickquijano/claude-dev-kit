# Sync target

Details step 9 (**Sync target**). Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

A dirty tree is a blocker. A non-fast-forward is allowed only when every extra local `<target>` commit is in the merged PR or MR (`is-ancestor` succeeds, which also holds after a squash merge); report it as `Main: <target> not fast-forwarded (local pre-release commits are in the merged PR or MR)`; this is a note and does not make `Release` unmet. Never reset. A skipped sync (blocker above) leaves local `<target>` as is.
