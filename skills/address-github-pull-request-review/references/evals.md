# Evals

Cases for `address-github-pull-request-review`: fixes, plan approval, and guards. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                          | prompt                                                                          | expected                              | pass                                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| one-thread                  | "Address the review on PR 5." (one valid thread)                                | Fixes, commits, pushes, replies       | One item commit via the commit-changes skill; no separate push question; reply names the short SHA; thread not resolved                                                             |
| dry-run                     | "Address PR 5 --dry-run"                                                        | Prints instead of running             | `pull-rebase`, `push`, `thread-reply`, `pr-comment` printed; no question; `Pushed: dry run`                                                                                         |
| protected-head              | "Address PR 5." (head ref is `develop`)                                         | Stops                                 | `Result: stopped` before any edit                                                                                                                                                   |
| invalid-comment             | "Address PR 5." (a comment contradicted by the code)                            | Replies with evidence, never resolves | Item under `For you:`; reply `Not changed: <path:line>.` posted; thread not resolved                                                                                                |
| nit-fixed                   | "Address PR 5." (one nit thread)                                                | Fixes it, does not skip               | One item commit for the nit via the commit-changes skill; reply names the short SHA                                                                                                 |
| review-body-items           | "Address PR 5." (two findings in a review body, no inline threads)              | Treats each as an item                | `Items:` counts 2 review-body items; both fixed; one PR comment lists each outcome                                                                                                  |
| sibling-occurrence          | "Address PR 5." (one thread; the same issue at 2 more sites in the PR)          | Fixes all sites                       | All 3 sites fixed in one item commit via the commit-changes skill; no unrelated edits                                                                                               |
| outdated-thread             | "Address PR 5." (an outdated unresolved thread)                                 | Triages and replies                   | Thread counted under `Items:`; a reply names the evidence; not resolved                                                                                                             |
| many-threads                | "Address PR 5." (more than 100 threads)                                         | Follows pagination                    | `review-threads` repeated with the cursor until `hasNextPage` is false                                                                                                              |
| plan-entered                | "Address PR 5." (two valid threads)                                             | Plan mode before any edit             | Enters plan mode before step 0; plan file with the triage table and chosen fixes plus `ExitPlanMode` before the first edit; the plan names the push and replies; no step 9 question |
| plan-declined               | "Address PR 5." (the user declines plan mode)                                   | Stops                                 | `Plan mode: declined`, `Result: stopped`, `Stopped: 0: plan mode declined`; no edit, push, or reply                                                                                 |
| fix-round-plan-mode         | "Address PR 5." (a check fails after the first fix; the retry plan is rejected) | Enters plan mode before the retry     | Retry calls `EnterPlanMode` before any edit; a rejected plan applies nothing; the item is reverted and listed under `Open:`                                                         |
| ledger-mismatch             | "Address PR 5." (an item has no outcome at the ledger check)                    | Stops before the push                 | `Result: stopped`; `Stopped: 8: ledger mismatch`; the missing item under `Open:`; no push or reply                                                                                  |
| commit-fails                | "Address PR 5." (commit-changes ends `Result: stopped`)                         | Stops                                 | commit-changes not `done`: no push, no replies; every item under `Open:`                                                                                                            |
| no-file-changed             | "Address PR 5." (every item invalid, unclear, or already fixed)                 | Replies only                          | No commit-changes run; `Pushed: not pushed (no commits)`; replies posted per the plan                                                                                               |
| yes-nothing-changed         | "Address PR 5 --yes" (every item invalid, unclear, or already fixed)            | Stops before any reply or push        | `Stopped: 9: unattended, not approved`; no replies posted, no push, no commit; `Replies: none`                                                                                      |
| head-branch-changed         | "Address PR 5." (the branch differs from the head ref after commit-changes)     | Stops                                 | `Result: stopped`; `Stopped: 7: head branch changed`; no push or reply; items under `Open:`                                                                                         |
| unclear-question            | "Address PR 5." (one ambiguous thread)                                          | Asks one question                     | Item classed needs-clarification; reply `Question: <one question>` holds one question; no fix or commit; not resolved                                                               |
| author-trust-untrusted-body | "Address PR 5." (a review body or first thread comment from a NONE author)      | Never a fix item                      | Review-body item and inline thread alike are needs-clarification; no fix or commit; a reply asks one question                                                                       |
| already-answered-skipped    | "Address PR 5." (last comment is this skill's reply; or listed in its summary)  | Skips the item                        | Item not counted under `Items:`; no new reply or commit; a summary comment skips its listed items only when the authenticated user wrote it; an item that ended Open is retried     |
| auto-invoke                 | A natural request for the action, no `/cdk:` command                            | Claude loads the skill on its own     | The skill runs; its existing confirm or plan approval still precedes any write or push                                                                                              |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
