# Gates

Fields come from `pr-get`, `pr-gaps`, `permission`, `reviews`, `checks-required`, `merge-methods`, and `rules` in `commands.md`.

## Contents

- Stop gates · Bypass eligibility · Blocker mapping · Method choice · Branch cleanup · Merge tool · Post-merge check

## Stop gates

| Condition                                              | Action                                         |
| ------------------------------------------------------ | ---------------------------------------------- |
| State closed or merged                                 | Stop; `Result: nothing-to-do` for merged       |
| Draft                                                  | Stop; report that it must be marked ready      |
| `mergeable` `CONFLICTING` or `mergeable_state` `dirty` | Stop; report the conflicts; no bypass          |
| `mergeable` `UNKNOWN`                                  | Re-read `pr-gaps` once; still `UNKNOWN` → stop |

## Bypass eligibility

A stop report, not a question: bypass still runs only when the user's input asks for it. Eligible only when all three hold:

1. PR author equals `self`.
2. Permission is `ADMIN` (compared upper-case; MCP `role_name` `admin` counts).
3. Only protection blocks the merge: not conflicts, not draft, not a closed or merged state.

Not eligible → read `reviews` and `checks-required`, report the blockers and the failed condition, `Result: stopped`, merge nothing.

## Blocker mapping

For the stop report and for a host refusal.

| Signal                                                  | Blocker line                       |
| ------------------------------------------------------- | ---------------------------------- |
| `mergeStateStatus` `BLOCKED`                            | Branch protection not satisfied    |
| `mergeStateStatus` `BEHIND`                             | Head behind base                   |
| `reviewDecision` `REVIEW_REQUIRED`                      | Required review missing            |
| `reviewDecision` `CHANGES_REQUESTED`                    | Changes requested                  |
| A `checks-required` row failing or pending              | Required check `<name>`: `<state>` |
| A `rules` entry (for example `required_linear_history`) | Ruleset rule `<type>`              |

## Method choice

Offer only methods `merge-methods` allows; drop Merge when `rules` has `required_linear_history`. One method left → skip the question, state it with the reason. The Recommended option goes first.

| Option | Recommended when | Reason | Trade-off when not recommended |
| --- | --- | --- | --- |
| Squash | Allowed | One commit per PR on the base | Folds the commits into one |
| Rebase | Squash not allowed and linear history required | Keeps history linear and the individual commits | Rewrites the commit SHAs onto the base |
| Merge | The only allowed method | Preserves the branch commits and their ancestry | Adds a merge commit |

## Branch cleanup

Under `--yes` the recommended option is taken; the stops above still apply. Head in a fork (`isCrossRepository` true) → do not ask; `Branch: not offered (fork)`; merge with Keep behavior. `deleteBranchOnMerge` true and head not in a fork → do not ask; merge with the Keep tool (no `--delete-branch`, so the local branch stays); state that the host deletes the head branch on merge (repo setting).

| Option | Recommended when | Reason |
| --- | --- | --- |
| Delete branch | Head repo is the base repo, the head ref is not `main`, `develop`, or `release/*`, and `dependents` returns no open PR | The work lands on the base; the branch can be restored from the PR page |
| Keep branch | Any of those fails, or `dependents` is unavailable (say so) | Deleting would close or retarget dependent PRs, or remove a long-lived branch |

The Delete option text says it deletes the remote and local branch and may move the checkout off that branch.

## Merge tool

| Path | Branch choice | Tool |
| --- | --- | --- |
| Standard | Keep | `merge-mcp` with `merge_method` and `expectedHeadSha`; `merge-gh` once on a non-policy error |
| Standard | Delete | `merge-gh` with `--delete-branch`; `Fallbacks: merge: MCP lacks delete-branch` |
| Admin bypass | Either | `merge-admin`, `--delete-branch` only for Delete; `Fallbacks: merge: MCP lacks bypass` |

Admin bypass runs only when the user's input asks for it and eligibility holds. Re-read `head.sha` just before merging; a change since the facts → stop and report, never merge a different head. A policy or "not mergeable" refusal is reported verbatim as the host's exact error and never retried or substituted; only a non-policy MCP error (or no server) runs `merge-gh` once.

## Post-merge check

| Check                                           | Expected | Mismatch                     |
| ----------------------------------------------- | -------- | ---------------------------- |
| `merge-commit` state                            | merged   | `Open: merge not confirmed`  |
| `merge-parents`, squash or rebase               | 1        | `Open: merge_method ignored` |
| `merge-parents`, merge                          | 2        | `Open: merge_method ignored` |
| `branch-exists` after Delete                    | 404      | `Open: branch still present` |
| `branch-exists` after Keep, no host auto-delete | 200      | `Open: branch missing`       |
| `branch-exists`, host auto-delete               | 404      | none                         |

With host auto-delete, report `Branch: deleted (host setting)` on 404 and `kept` on 200 (the host may keep a branch it cannot delete).
