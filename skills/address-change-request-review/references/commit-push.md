# Commit and push

Step 12 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

- Commit message: `commitlint` when configured (`npx --no-install commitlint --edit <scratch>/msg` form); fail → redraft the subject (cap in Rules); not installed → note it.
- Signing failure on `commit` → stop per conventions.md. `signatures`: every flag `G`, else stop.
- For push: re-fetch the CR per the host `## Re-fetch before a mutation`; head ≠ `headSha` or CR not open → retry per the stale-head cap (3 × 5 s) only for a lagging read, then stop ("new commits on the CR").
- `push`; rejected → report the exact line, stop.
