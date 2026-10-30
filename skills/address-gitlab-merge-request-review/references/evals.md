# Evals

Cases for `address-gitlab-merge-request-review`: fixes, plan approval, remote parsing, and guards. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                       | prompt                                                                        | expected                              | pass                                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| one-discussion           | "Address the review on MR 5." (one valid open discussion)                     | Fixes, commits, pushes, replies       | One item commit via the commit-changes skill; no separate push question; reply names the short SHA; discussion not resolved                                                         |
| dry-run                  | "Address MR 5 --dry-run"                                                      | Prints instead of running             | `pull-rebase`, `push`, `discussion-reply` printed; no question; `Pushed: dry run`                                                                                                   |
| protected-source         | "Address MR 5." (source branch is `develop`)                                  | Stops                                 | `Result: stopped` before any edit                                                                                                                                                   |
| invalid-comment          | "Address MR 5." (a comment contradicted by the code)                          | Replies with evidence, never resolves | Item under `For you:`; reply `Not changed: <path:line>.` posted; discussion not resolved                                                                                            |
| nit-fixed                | "Address MR 5." (one nit discussion)                                          | Fixes it, does not skip               | One item commit for the nit via the commit-changes skill; reply names the short SHA                                                                                                 |
| review-body-items        | "Address MR 5." (two findings in a review body, no inline discussions)        | Treats each as an item                | `Items:` counts 2 review-body items; both fixed; one MR comment lists each outcome                                                                                                  |
| sibling-occurrence       | "Address MR 5." (one discussion; the same issue at 2 more sites in the MR)    | Fixes all sites                       | All 3 sites fixed in one item commit via the commit-changes skill; no unrelated edits                                                                                               |
| line-gone-discussion     | "Address MR 5." (an open discussion whose line is gone at the source head)    | Triages and replies                   | Discussion counted under `Items:`; a reply names the evidence; not resolved                                                                                                         |
| many-discussions         | "Address MR 5." (more than 100 discussions)                                   | Follows pagination                    | `discussions` repeated with `page=2`, `page=3`, … until a page returns fewer than 100                                                                                               |
| plan-entered             | "Address MR 5." (two valid discussions)                                       | Plan mode before any edit             | Enters plan mode before step 0; plan file with the triage table and chosen fixes plus `ExitPlanMode` before the first edit; the plan names the push and replies; no step 8 question |
| plan-declined            | "Address MR 5." (the user declines plan mode)                                 | Stops                                 | `Plan mode: declined`, `Result: stopped`, `Stopped: 0: plan mode declined`; no edit, push, or reply                                                                                 |
| fix-round-plan-mode      | "Address MR 5." (a job fails after the first fix; the retry plan is rejected) | Enters plan mode before the retry     | Retry calls `EnterPlanMode` before any edit; a rejected plan applies nothing; the item is reverted and listed under `Open:`                                                         |
| auto-invoke              | A natural request for the action, no `/cdk:` command                          | Claude loads the skill on its own     | The skill runs; its existing confirm or plan approval still precedes any write or push                                                                                              |
| failing-pipeline         | "Address MR 5." (latest pipeline `failed`, one failed job, no discussions)    | Fixes from the job log                | `failed-jobs` and `job-log` run; item counted under failing jobs; one `fix` item commit via the commit-changes skill                                                                |
| change-request           | "Address MR 5." (reviewer state `requested_changes`, no note body)            | Asks one question                     | Item under `For you:` as needs-clarification; the question is in the summary note                                                                                                   |
| fork-mr-stops            | "Address MR 5." (`source_project_id` differs from `target_project_id`)        | Stops before any edit                 | `Result: stopped`; reason names the fork; no edit, push, or reply                                                                                                                   |
| github-remote-stops      | "Address MR 5." (`origin` is `git@github.com:o/r.git`)                        | Stops at tooling                      | `Result: stopped`; `Stopped: 0: no GitLab remote`; no write                                                                                                                         |
| nested-group-self-hosted | "Address !5." (`origin` is `git@gitlab.example.com:a/b/c.git`)                | Resolves host and full path           | `parse-ref` returns host `gitlab.example.com`, project `a/b/c`, iid 5; `<enc>` is `a%2Fb%2Fc`; no `a/b` truncation                                                                  |
| auth-403-stops           | "Address MR 5." (`get_project` or `glab api` returns 403)                     | Stops with the fix                    | `Result: stopped`; `Stopped: 0`; fix names `glab auth login --hostname <host>`; no token printed                                                                                    |
| neither-tool-stops       | "Address MR 5." (no GitLab MCP, no `glab` auth)                               | Stops before any edit                 | `Result: stopped`; `Stopped: 0: no GitLab MCP and no glab auth`                                                                                                                     |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
