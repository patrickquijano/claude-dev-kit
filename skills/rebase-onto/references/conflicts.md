# Conflicts

Step 6 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

- Files: `conflicted-files`. Commit replayed: `replayed-commit`. Merge-base = `merge-base`.
- Analysis: ≥3 files → spawn `cdk:conflict-analyzer` per file with root, file, `REBASE_HEAD` sha, target, merge-base (≤4 per message); keep each `Conflict:`, `Hunks:`, and `Recommendation:` block; `Known issue:` lines per Rules. Fewer → inline: read conflict hunks; mine `theirs-diff`; ours `ours-log` (target commits plus already-replayed commits).
- AskUserQuestion per file (≤4 per batch). Recommend per analysis (default Merge both unless one side clearly supersedes the other); give its justification:
  - Merge both — combine hunks (analyzer `combined` text or by hand); keeps both sides. Show the proposed combined hunk in the per-file question itself; choosing Merge both writes it and continues to `stage-file`. Revise (an option in that same question, max 5 rounds) lets the user edit the combined hunk, then re-asks; no second Accept ask.
  - Keep target — `keep-target` (`HEAD`: target plus your already-replayed commits). Whole file: discards all your changes to it from this commit.
  - Keep mine — `keep-mine`. Whole file: discards all target changes to it (may undo upstream fixes).
  - Abort rebase — `rebase-abort`, stop, `Result: cancelled` (conflict too broad / needs author).
- `Conflict:` `delete/modify` (inline: file deleted on one side, modified on the other) → this AskUserQuestion instead of the one above, recommend per analysis: Delete file (`remove-file`; drops the other side's changes) | Keep file (`stage-file`; keeps the modified version, undoes the deletion) | Abort rebase (`rebase-abort`).
- Resolved file: no `<<<<<<<`/`>>>>>>>` markers left, then `stage-file`.
- `staged-empty` exit 0 (commit now empty; change already in target) → `skip` without asking; list it under Skipped.
- Else `continue`. New conflicts → repeat step 6.
