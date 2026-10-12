# Pre-flight and remote branches

Steps 1–3 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

## Pre-flight (step 1)

- `current-branch` = `HEAD` (detached) → stop.
- `status` shows "rebase in progress" → stop, tell user to finish or `rebase-abort`.
- `dirty-tracked` non-empty → stop, suggest `/cdk:commit-changes`.
- Signing per `${CLAUDE_SKILL_DIR}/../commit-changes/references/conventions.md` `## Signing` (read the allowed signers file to check the key). Missing or mismatch → stop, tell user what to set.

## Remote branches (step 2)

- `fetch`; fail or no `origin` → report exact error line, stop.
- `upstream` exists and `behind-upstream` > 0 → `upstream-cherry`: every line `-` (patch already local, earlier rebase not pushed yet) → continue; any `+` → stop, tell user remote has new commits missing locally (pull first).
- List `remote-branches`. Drop `origin/HEAD`, `origin` and `origin/<current>`. Default = `default-branch` (unset → `origin/main` if listed). None left → stop.

## Target (step 3)

- No ask. Input names a branch → use it if in list or `verify-ref` passes; else report, stop.
- No input → default (mainline, where work integrates); default not listed → stop, tell user to name a target.
- Report `divergence` → "<behind> behind, <ahead> ahead".
