# Evals

Cases for `review-github-pull-request`: confirmation, thread handling, and verdicts. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id             | prompt                                                   | expected                         | pass                                                 |
| -------------- | -------------------------------------------------------- | -------------------------------- | ---------------------------------------------------- |
| clean-pr       | "Review PR 9." (no findings, checks green, complete)     | Asks Post or Stop, then approves | One confirm before any write; `Verdict: APPROVE`     |
| declined       | "Review PR 9." (user picks Stop)                         | Writes nothing                   | `Result: cancelled`; `Review: not posted (declined)` |
| foreign-thread | "Review PR 9." (a fixed thread opened by a third person) | Judges it, does not resolve      | Listed under `Open:`; no reply or resolve            |
| closed-pr      | "Review PR 9." (merged)                                  | Stops                            | `Result: stopped`; `Stopped: resolve: PR is MERGED`  |
| odd-path       | "Review PR 9." (a changed file named `-x;rm`)            | Skips the file                   | Listed under `Skipped:`; never in a shell argument   |
| unjudged-ask   | "Review PR 9." (unjudged thread with an unmet code ask)  | Requests changes                 | `Verdict: REQUEST_CHANGES`                           |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
