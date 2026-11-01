# Merge choices

Fields come from `pr-get`, `pr-gaps`, `merge-methods`, and `rules` in `commands.md`.

## Contents

- Method choice · Branch cleanup · Merge tool · Post-merge check

## Method choice

Offer only methods `merge-methods` allows; drop Merge when `rules` has `required_linear_history`. One method left → skip the question, state it with the reason. The Recommended option goes first.

| Option | Recommended when                               | Reason                                          | Trade-off when not recommended         |
| ------ | ---------------------------------------------- | ----------------------------------------------- | -------------------------------------- |
| Squash | Allowed                                        | One commit per PR on the base                   | Folds the commits into one             |
| Rebase | Squash not allowed and linear history required | Keeps history linear and the individual commits | Rewrites the commit SHAs onto the base |
| Merge  | The only allowed method                        | Preserves the branch commits and their ancestry | Adds a merge commit                    |

## Branch cleanup

Head in a fork (`isCrossRepository` true) → do not ask; `Branch: not offered (fork)`; merge with Keep behavior.

| Option        | Recommended when                                                                                                       | Reason                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Delete branch | Head repo is the base repo, the head ref is not `main`, `develop`, or `release/*`, and `dependents` returns no open PR | The work lands on the base; the branch can be restored from the PR page       |
| Keep branch   | Any of those fails, or `dependents` is unavailable (say so)                                                            | Deleting would close or retarget dependent PRs, or remove a long-lived branch |

The Delete option text says it deletes the remote and local branch and may move the checkout off that branch.

## Merge tool

| Path         | Branch choice | Tool                                                                                         |
| ------------ | ------------- | -------------------------------------------------------------------------------------------- |
| Standard     | Keep          | `merge-mcp` with `merge_method` and `expectedHeadSha`; `merge-gh` once on a non-policy error |
| Standard     | Delete        | `merge-gh` with `--delete-branch`; `Fallbacks: merge: MCP lacks delete-branch`               |
| Admin bypass | Either        | `merge-admin`, `--delete-branch` only for Delete; `Fallbacks: merge: MCP lacks bypass`       |

Admin bypass runs only when the user's input asks for it. Re-read `head.sha` just before merging and merge that head. A refusal (policy, "not mergeable", or any other error) is reported verbatim as the host's exact error; the merge is not retried or substituted.

## Post-merge check

| Check                             | Expected | Mismatch                     |
| --------------------------------- | -------- | ---------------------------- |
| `merge-commit` state              | merged   | `Open: merge not confirmed`  |
| `merge-parents`, squash or rebase | 1        | `Open: merge_method ignored` |
| `merge-parents`, merge            | 2        | `Open: merge_method ignored` |
| `branch-exists` after Delete      | 404      | `Open: branch still present` |
| `branch-exists` after Keep        | 200      | `Open: branch missing`       |
