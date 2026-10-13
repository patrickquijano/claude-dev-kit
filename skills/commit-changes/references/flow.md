# Flow details

## Contents

- Group · Commit failures · Open items

## Group

Small path: one group of every changed file, no `Split`, no `Excluded`. Draft the subject here per `conventions.md`: type from paths (`docs` for `*.md` or docs only, `test` for test files only, `ci` for CI files, `build` for manifests or build config only, `chore` for other config, else `feat` for added functionality or `fix` for corrective changes judged from file names and numstat; unsure → `chore`), an optional single-area scope, and an imperative summary. Switching → branch `<type>/<short-description>` from the same type and summary.

Analyzed path: spawn `cdk:change-analyzer` with root, `mode=group`, `paths` (when given), `branch=<yes if step 5 needs a switch, else no>`, the input hints, and `${CLAUDE_SKILL_DIR}/references/conventions.md`. Take `Groups`, `Split`, `Branch`, and `Excluded` from its return. `Questions` non-empty → AskUserQuestion, then respawn once with the answers. One file mixes unrelated changes (`Split`) → write group `<n>`'s hunks of `diff-file` to `<scratch>/<n>.patch` using the returned `@@` headers; stage nothing yet (step 8 applies it).

Commitlint config exists → per subject write `<scratch>/msg` and run `commitlint`; a failure → redraft from the error lines (analyzed: respawn with `mode=group`, the prior `Groups`, `Split`, `Excluded`, and the error lines, so only failing subjects change). Cap 3 per subject. Write `.patch` files only after every subject passes.

Switching → name the branch from `Branch` (analyzed) or the small-path name; exists (`local-branch-exists` exit 0, or `remote-branch-exists` non-empty; an error there = not on remote) → append `-2`, `-3`, … up to 10 tries.

## Commit failures

- `switch-branch` fails → report the exact error line, then stop.
- Signing fails → stop per `conventions.md` `## Signing`; never retry unsigned.
- Other hook failure → diagnose the root cause, fix it, re-stage, commit again (cap 3 per commit); cap hit → stop.

## Open items

Collect these into `Open:` with the impact and the user's recommended fix; stage, edit, and push nothing here:

- `Excluded:` secret-flagged files.
- `Commitlint:` skipped or failed.
- `not pushed` because there is no origin.
- Any stop from step 6 onward (commitlint cap, step 8 or 9 failure, push failure), on what is left.

No item → `Open: none`.
