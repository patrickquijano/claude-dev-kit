# Check state

Details step 4 (**Check state**). Read-only, before any write. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

- Release: `release-view`: success → release exists. Also `release-list` matching `tagName` (the list is the documented route to drafts, which `view` may not find). Exists → `Release: <url> (already exists)`, `Result: nothing-to-do`, `Stopped: none`, then step 8; never modify it. The `release not found` error means absent; any other error (network, auth, rate limit) → stop with its text.
- Local tag: `local-tag`.
- Remote tag: `remote-tag`; the `^{}` line's id is the commit of an annotated tag, else the line's id.
- Each tag found must equal the verified commit. Otherwise → `Stopped: 4: tag-mismatch: <tag> points to <sha>, main is <sha>`. Local and remote both present must agree.
- State → action: none → create and push; local only (at the commit) → push it; remote present → reuse; so the release step is reached only for a valid tag.
