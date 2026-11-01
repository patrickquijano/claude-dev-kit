# Merge choices

Fields come from `mr-get` and `merge-methods` in `commands.md`.

## Contents

- Method choice · Branch cleanup · Merge tool · Post-merge check

## Method choice

Offer only methods `merge-methods` allows: `squash_option` `never` drops Squash and `always` leaves only Squash; `merge_method` `ff` replaces Merge with Rebase (fast-forward, no rebase flag), `merge` or `rebase_merge` keeps Merge. One method left → skip the question, state it with the reason. The Recommended column is the only source of the recommendation here, and that option goes first.

| Option | Recommended when                              | Reason                                          | Trade-off when not recommended |
| ------ | --------------------------------------------- | ----------------------------------------------- | ------------------------------ |
| Squash | Allowed                                       | One commit per MR on the target                 | Folds the commits into one     |
| Rebase | Squash not allowed and `merge_method` is `ff` | Keeps history linear and the individual commits | Needs the source up to date    |
| Merge  | The only allowed method                       | Preserves the branch commits and their ancestry | Adds a merge commit            |

## Branch cleanup

Source in a fork (`source_project_id` differs from `target_project_id`) → do not ask; `Branch: not offered (fork)`; merge with Keep behavior. `force_remove_source_branch` true → do not ask; Delete, stated with the reason.

| Option        | Recommended when                                                                             | Reason                                                                        |
| ------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Delete branch | The source ref is not `main`, `develop`, or `release/*`, and `dependents` returns no open MR | The work lands on the target; the branch can be restored from the MR page     |
| Keep branch   | Any of those fails, or `dependents` is unavailable (say so)                                  | Deleting would close or retarget dependent MRs, or remove a long-lived branch |

The Delete option text says it removes the remote source branch only; a local branch stays.

## Merge tool

| Branch choice | Tool                                                                                    |
| ------------- | --------------------------------------------------------------------------------------- |
| Keep          | `merge-mcp` with `squash` per Method and `sha`; `merge-glab` once on a non-policy error |
| Delete        | Same, with `should_remove_source_branch` (MCP) or `--remove-source-branch` (`glab`)     |

Re-read `sha` just before merging and merge that head. A refusal (policy, "cannot be merged", or any other error) is reported verbatim as the host's exact error; the merge is not retried or substituted, and auto-merge is never used. The merge completes asynchronously; verify afterwards.

## Post-merge check

| Check                        | Expected                      | Mismatch                     |
| ---------------------------- | ----------------------------- | ---------------------------- |
| `merge-state` `state`        | merged                        | `Open: merge not confirmed`  |
| `squash_commit_sha`, Squash  | non-empty                     | `Open: merge_method ignored` |
| `merge-parents`, Merge       | 2                             | `Open: merge_method ignored` |
| `merge-parents`, Rebase      | `merge_commit_sha` empty or 1 | `Open: merge_method ignored` |
| `branch-exists` after Delete | 404                           | `Open: branch still present` |
| `branch-exists` after Keep   | 200                           | `Open: branch missing`       |
