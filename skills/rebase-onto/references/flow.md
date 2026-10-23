# Flow details

## Contents

- Pre-flight · Remote branches · Target · Conflict loop · Push · Open items

## Pre-flight

- Detached `HEAD` → stop. `status` shows "rebase in progress" → stop; tell the user to finish it or `rebase-abort`. `dirty-tracked` non-empty → stop; suggest `/cdk:commit-changes`.
- Signing: `git config --get user.signingkey` is set. `gpg.format` = `ssh` → `gpg.ssh.allowedSignersFile` is set, the file exists (`~` expanded), and it holds the signing public key (`user.signingkey` itself when it starts `ssh-`, `ecdsa-`, or `sk-` after stripping `key::`, else the first two fields of the `.pub` file). `.husky/` exists → `commit.gpgsign` = `true`. Missing or mismatch → stop and say what to set. Never edit signing config or retry unsigned; a signing failure during the rebase stops with the exact error line.

## Remote branches

- `fetch`; failure or no `origin` → report the exact error line, stop.
- `upstream` exists and `behind-upstream` > 0 → `upstream-cherry`: every line `-` (patch already local) → continue; any `+` → stop; the remote has commits missing locally (pull first).
- List `remote-branches`; drop `origin/HEAD`, `origin`, and `origin/<current>`. Default = `default-branch` (unset → `origin/main` if listed). None left → stop.

## Target

No question. Input names a branch → try `origin/<input>` first (listed or `verify-ref` passes), then the local `<input>` (`verify-ref`), else report and stop. No input → the default; not listed → stop and tell the user to name a target. Report `divergence` as "<behind> behind, <ahead> ahead".

## Conflict loop

- Files: `conflicted-files`; commit: `replayed-commit`; ancestor: `merge-base`.
- Analysis: always one `cdk:conflict-analyzer` per file with root, file, `REBASE_HEAD` sha, target, and merge-base (≤4 per message); keep each `Conflict:`, `Hunks:`, and `Recommendation:` block.
- AskUserQuestion per file (≤4 per batch), recommendation from the analysis with its justification (default Merge both unless one side clearly supersedes):
  - Merge both: combine the hunks (analyzer `combined` text or by hand); show the proposed hunk in the question; choosing it writes it and continues to `stage-file`. A Revise option (max 5 rounds) lets the user edit it, then re-asks.
  - Keep target: `keep-target`; discards all your changes to the file from this commit.
  - Keep mine: `keep-mine`; discards all target changes to the file.
  - Abort rebase: `rebase-abort`, `Result: cancelled`.
- `delete/modify` conflict → instead ask: Delete file (`remove-file`) | Keep file (`stage-file`) | Abort rebase.
- Resolved file: no `<<<<<<<` or `>>>>>>>` markers left, then `stage-file`.
- `staged-empty` exit 0 (change already in target) → `skip` without asking; list it under `Skipped:`. Else `continue`; new conflicts → repeat.

## Push

- `open-mr` returns an open MR or `open-pr` returns an open PR (CLI missing or error → skip) → warn that the push rewrites its history and may outdate review comments.
- Upstream = `origin/<current>` → ask: Push with lease (Recommended; the remote holds the pre-rebase history) | Skip. Lease → `push-lease`.
- Upstream is another branch (e.g. `origin/main`) → never force; ask: Skip (Recommended) | Push -u to `origin/<current>` (no force; rejected if it holds other history) → `push-upstream`.
- No upstream → ask: Push -u (Recommended) | Skip → `push-upstream`.
- Failure → report the exact error line, stop.

## Open items

Collect into `Open:` with impact and the command for the user to run; edit and redo nothing: an unattended conflict abort (the files that conflicted), `Skipped:` commits, `Conflicts:` resolutions that discarded changes, `Pushed: no`, and any stop's leftover state (a rebase still in progress → `rebase-abort` undoes it).
