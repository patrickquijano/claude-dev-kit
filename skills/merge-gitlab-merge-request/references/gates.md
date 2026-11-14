# Gates

Fields come from `mr-get` and `merge-methods` in `commands.md`.

## Contents

- Stop gates · Bypass eligibility · Blocker mapping · Method choice · Branch cleanup · Merge tool · Post-merge check

## Stop gates

| Condition                                                    | Action                                       |
| ------------------------------------------------------------ | -------------------------------------------- |
| `state` closed, merged, or locked                            | Stop; `Result: nothing-to-do` for merged     |
| `draft` true (`detailed_merge_status` `draft_status`)        | Stop; report that it must be marked ready    |
| `has_conflicts` true (`detailed_merge_status` `conflict`)    | Stop; report the conflicts; no merge         |
| `checking`, `unchecked`, `preparing`, or `approvals_syncing` | Re-read `mr-get` once; still the same → stop |

## Bypass eligibility

No MR is eligible: the merge API has no admin or skip option. A stop report, not a question: when the user's input asks for a bypass, list the blockers per `## Blocker mapping`, `Result: stopped`, merge nothing, and never switch to auto-merge as a substitute.

## Blocker mapping

For a host refusal or a bypass request, read `detailed_merge_status` from `mr-get` and list the blockers and who can act (reviewer, author, maintainer).

| Signal (`detailed_merge_status`) | Blocker line                    |
| -------------------------------- | ------------------------------- |
| `not_approved`                   | Required approval missing       |
| `requested_changes`              | Changes requested               |
| `ci_must_pass`                   | Pipeline must succeed           |
| `ci_still_running`               | Pipeline still running          |
| `need_rebase`                    | Source behind target; rebase it |
| `discussions_not_resolved`       | Open discussions                |
| `status_checks_must_pass`        | External status checks pending  |
| `merge_request_blocked`          | Blocked by another MR           |
| Any other non-`mergeable` value  | Merge blocked: `<value>`        |

## Method choice

Offer only methods `merge-methods` allows: `squash_option` `never` drops Squash and `always` leaves only Squash; `merge_method` `ff` replaces Merge with Rebase (fast-forward, no rebase flag), `merge` or `rebase_merge` keeps Merge. One method left → skip the question, state it with the reason. The Recommended column is the only source of the recommendation here, and that option goes first.

| Option | Recommended when | Reason | Trade-off when not recommended |
| --- | --- | --- | --- |
| Squash | Allowed | One commit per MR on the target | Folds the commits into one |
| Rebase | Squash not allowed and `merge_method` is `ff` | Keeps history linear and the individual commits | Needs the source up to date |
| Merge | The only allowed method | Preserves the branch commits and their ancestry | Adds a merge commit |

## Branch cleanup

Under `--yes` the recommended option is taken; the stop gates still apply. Source in a fork (`source_project_id` differs from `target_project_id`) → do not ask; `Branch: not offered (fork)`; merge with Keep behavior. `force_remove_source_branch` true → do not ask; Delete, stated with the reason.

| Option | Recommended when | Reason |
| --- | --- | --- |
| Delete branch | The source ref is not `main`, `develop`, or `release/*`, and `dependents` returns no open MR | The work lands on the target; the branch can be restored from the MR page |
| Keep branch | Any of those fails, or `dependents` is unavailable (say so) | Deleting would close or retarget dependent MRs, or remove a long-lived branch |

The Delete option text says it removes the remote source branch only; a local branch stays.

## Merge tool

| Branch choice | Tool                                                                                    |
| ------------- | --------------------------------------------------------------------------------------- |
| Keep          | `merge-mcp` with `squash` per Method and `sha`; `merge-glab` once on a non-policy error |
| Delete        | Same, with `should_remove_source_branch` (MCP) or `--remove-source-branch` (`glab`)     |

Re-read `sha` just before merging; a change since the facts → stop and report, never merge a different head. A policy or "cannot be merged" refusal is reported verbatim as the host's exact error and never retried or substituted; only a non-policy MCP error (or no server) runs `merge-glab` once. Auto-merge is never used. The merge completes asynchronously; verify afterwards.

## Post-merge check

| Check                        | Expected                      | Mismatch                     |
| ---------------------------- | ----------------------------- | ---------------------------- |
| `merge-state` `state`        | merged                        | `Open: merge not confirmed`  |
| `squash_commit_sha`, Squash  | non-empty                     | `Open: merge_method ignored` |
| `merge-parents`, Merge       | 2                             | `Open: merge_method ignored` |
| `merge-parents`, Rebase      | `merge_commit_sha` empty or 1 | `Open: merge_method ignored` |
| `branch-exists` after Delete | 404                           | `Open: branch still present` |
| `branch-exists` after Keep   | 200                           | `Open: branch missing`       |
