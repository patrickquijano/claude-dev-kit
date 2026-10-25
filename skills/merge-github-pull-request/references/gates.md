# Gates

Fields come from `pr-get`, `pr-gaps`, `reviews`, `checks-required`, `permission`, `merge-methods`, and `rules` in `commands.md`.

## Contents

- Stop gates · Standard-path readiness · Bypass eligibility · Blocker mapping · Method choice · Branch cleanup · Merge tool · Post-merge check

## Stop gates

| Condition                                              | Action                                         |
| ------------------------------------------------------ | ---------------------------------------------- |
| State closed or merged                                 | Stop; `Result: nothing-to-do` for merged       |
| Draft                                                  | Stop; report that it must be marked ready      |
| `mergeable` `CONFLICTING` or `mergeable_state` `dirty` | Stop; report the conflicts; no bypass          |
| `mergeable` `UNKNOWN`                                  | Re-read `pr-gaps` once; still `UNKNOWN` → stop |

## Standard-path readiness

Ready when all hold; otherwise go to the bypass gate.

| Field              | Ready value                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| `reviewDecision`   | `APPROVED`, or empty (no review required; state this assumption in `Open:`) |
| `mergeStateStatus` | `CLEAN`, `UNSTABLE`, or `HAS_HOOKS`, so every required check passes         |

## Bypass eligibility

Eligible only when all three hold:

1. PR author equals `self`.
2. Permission is `ADMIN` (compared upper-case; MCP `role_name` `admin` counts).
3. Only protection blocks the merge: not conflicts, not draft, not a closed or merged state.

Not eligible → report the blockers and the failed condition, never offer bypass, `Result: stopped`.

## Blocker mapping

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

| Path     | Branch choice | Tool                                                                                         |
| -------- | ------------- | -------------------------------------------------------------------------------------------- |
| Standard | Keep          | `merge-mcp` with `merge_method` and `expectedHeadSha`; `merge-gh` once on a non-policy error |
| Standard | Delete        | `merge-gh` with `--delete-branch`; `Fallbacks: merge: MCP lacks delete-branch`               |
| Bypass   | Either        | `merge-admin`, `--delete-branch` only for Delete; `Fallbacks: merge: MCP lacks bypass`       |

Re-read `head.sha` just before merging; a change since the facts → stop and report, never merge a different head.

## Post-merge check

| Check                             | Expected | Mismatch                     |
| --------------------------------- | -------- | ---------------------------- |
| `merge-commit` state              | merged   | `Open: merge not confirmed`  |
| `merge-parents`, squash or rebase | 1        | `Open: merge_method ignored` |
| `merge-parents`, merge            | 2        | `Open: merge_method ignored` |
| `branch-exists` after Delete      | 404      | `Open: branch still present` |
| `branch-exists` after Keep        | 200      | `Open: branch missing`       |
