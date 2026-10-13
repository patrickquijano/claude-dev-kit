# Snapshot

Steps 1-3 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

## Unsafe state

`git-path` for `MERGE_HEAD`, `CHERRY_PICK_HEAD`, `REVERT_HEAD`, `rebase-merge`, `rebase-apply`, `BISECT_LOG`: any exists → stop with `Stopped: 1: unsafe-state (<name>)`; the tree is mid-operation and not a coherent change set.

## Range

- Default: base = `merge-base` of `origin/<default>` and `HEAD`. `<default>` is the `default-branch` value minus `origin/`; else an existing `origin/main`, else an existing `origin/master`. This covers unpushed commits plus uncommitted work. No such remote ref, or `merge-base` fails → base = `HEAD`, and say the review covers uncommitted changes only.
- `--uncommitted`: base = `HEAD`.
- Head = the snapshot SHA. An empty diff (`name-status`) → `Result: nothing-to-do`.

## Snapshot

1. `scratch`, then `temp-index`, `temp-add`, `temp-tree` with `GIT_INDEX_FILE` pointing at `<scratch>/index`: the user's real index is never read or written. Ignored files stay out (`add -A` honors `.gitignore`).
2. `snapshot` with the tree gives a dangling commit SHA; no ref points at it and nothing is signed. It stays until git garbage-collects it.
3. The scratch dir is left for the OS temp cleaner; the skill never deletes it.
4. Pass the snapshot SHA as the reviewers' head; `git show <snapshot>:<file>` equals the file in the working tree. The snapshot's own commit is synthetic, so reviewers read commits from `log.txt`.
