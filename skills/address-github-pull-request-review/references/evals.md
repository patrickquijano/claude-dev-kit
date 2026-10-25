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

| id              | prompt                                               | expected                        | pass                                                                                                                                                                                |
| --------------- | ---------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| one-thread      | "Address the review on PR 5." (one valid thread)     | Fixes, commits, pushes, replies | One commit; no separate push question; reply names the short SHA; thread not resolved                                                                                               |
| dry-run         | "Address PR 5 --dry-run"                             | Prints instead of running       | `pull-rebase`, `push`, `thread-reply` printed; no question; `Pushed: dry run`                                                                                                       |
| protected-head  | "Address PR 5." (head ref is `develop`)              | Stops                           | `Result: stopped` before any edit                                                                                                                                                   |
| invalid-comment | "Address PR 5." (a comment contradicted by the code) | Lists it, never replies         | Item under `For you:`; no reply posted                                                                                                                                              |
| many-threads    | "Address PR 5." (more than 100 threads)              | Follows pagination              | `review-threads` repeated with the cursor until `hasNextPage` is false                                                                                                              |
| plan-entered    | "Address PR 5." (two valid threads)                  | Plan mode before any edit       | Enters plan mode before step 0; plan file with the triage table and chosen fixes plus `ExitPlanMode` before the first edit; the plan names the push and replies; no step 8 question |
| plan-declined   | "Address PR 5." (the user declines plan mode)        | Stops                           | `Plan mode: declined`, `Result: stopped`, `Stopped: 0: plan mode declined`; no edit, push, or reply                                                                                 |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
