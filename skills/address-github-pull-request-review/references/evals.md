# Evals

Cases for `address-github-pull-request-review`: fixes, confirmation, and guards. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id              | prompt                                               | expected                              | pass                                                                                    |
| --------------- | ---------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| one-thread      | "Address the review on PR 5." (one valid thread)     | Fixes, commits, asks, pushes, replies | One commit; one Push and reply question; reply names the short SHA; thread not resolved |
| dry-run         | "Address PR 5 --dry-run"                             | Prints instead of running             | `pull-rebase`, `push`, `thread-reply` printed; no question; `Pushed: dry run`           |
| protected-head  | "Address PR 5." (head ref is `develop`)              | Stops                                 | `Result: stopped` before any edit                                                       |
| invalid-comment | "Address PR 5." (a comment contradicted by the code) | Lists it, never replies               | Item under `For you:`; no reply posted                                                  |
| many-threads    | "Address PR 5." (more than 100 threads)              | Follows pagination                    | `review-threads` repeated with the cursor until `hasNextPage` is false                  |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
