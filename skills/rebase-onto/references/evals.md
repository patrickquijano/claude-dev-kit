# Evals

Cases for `rebase-onto`: the signed rebase, conflict handling, the push confirmation, and the stop behaviors. Test each on Haiku, Sonnet, and Opus.

## Contents

- Template · Cases · Running per model

## Template

```text
id: <kebab-case>
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id               | prompt                                                                         | expected behavior                       | pass                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| clean-rebase     | "Rebase onto main." (no conflicts, signing set, upstream is `origin/<branch>`) | Rebases, verifies, asks before the push | `check-signing` ok; one signed `rebase`; every `%G?` is `G`; asks Push with lease or Skip; `Result: done` |
| dirty-tree       | "Rebase on main." (uncommitted tracked changes)                                | Stops before any rebase                 | `Result: stopped`; `Next:` says to commit the uncommitted changes and rerun; no git write                 |
| merge-commits    | "Rebase onto develop." (the branch holds merge commits)                        | Adds `--rebase-merges` without asking   | `rebase` carries only that extra flag; no question about it                                               |
| conflict-resolve | "Rebase onto main." (one conflicted file)                                      | Analyzes, asks, resolves, continues     | One analysis per file; AskUserQuestion with a recommendation; no markers left; `continue` runs            |
| analyzer-down    | "Rebase onto main." (the conflict analyzer cannot be spawned)                  | Analyzes the file inline                | No second spawn attempt past the respawn; the file is read here; the question still has a recommendation  |
| unattended       | "Rebase onto main." (run as a subagent, no way to ask, a conflict appears)     | Aborts at the first conflict            | `rebase-abort` runs; no push; `Open:` lists the conflicted files; `Result: stopped`                       |
| bad-signing      | "Rebase onto main." (`check-signing` reports `gpgsign-off`)                    | Stops with the fix                      | `Stopped: 1:` carries the fix; no rebase run; signing config unchanged                                    |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
