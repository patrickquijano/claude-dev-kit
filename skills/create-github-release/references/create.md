# Create

Details step 6 (**Create**). Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

- Tag: `create-tag`; then `push-tag` (plain, never force). A rejected push → stop, nothing else is retried.
- Release: `create-release` (no `--draft`, `--prerelease`, or `--target`). `--verify-tag` aborts rather than letting GitHub create a lightweight tag from the default branch.
- `create-release` fails after the tag is pushed → `Stopped: 6: release-create-failed: <error>`; the tag stays, and a rerun reuses it (step 4).
- Verify: `verify-release`: draft or prerelease true, or the tag missing → finding (`Blocked:`); never edited.
