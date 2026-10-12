# Push

Step 8 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

- `open-mr` returns an open MR (glab missing or error → skip check) → warn that push rewrites the MR history and may mark review comments outdated.
- Upstream = `origin/<current>` → AskUserQuestion: Push with lease (Recommended, remote still has pre-rebase history) | Skip. Push with lease → `push-lease`.
- Upstream is another branch (e.g. `origin/main`) → never force; AskUserQuestion: Skip (Recommended, upstream `<u>` is not this branch) | Push -u to `origin/<current>` (no force; rejected if it holds other history); Push -u → `push-upstream`.
- No upstream → ask: Push -u (Recommended) | Skip; Push -u → `push-upstream`.
- Fail → report exact error line, step 9, then `Stopped:`.
