# Evals

Cases for `merge-github-pull-request`: standard merges, admin bypass when asked, stop gates, and refusals. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                | prompt                                                                             | expected                                                                                  | pass                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| green-squash      | "Merge PR 12." (approved, checks green, own repo branch)                           | Asks Method and Branch, then squashes                                                     | One question call; `Tool: mcp merge_pull_request`; `merge-parents` is 1                                                  |
| mcp-down          | "Merge PR 12." (MCP server not connected)                                          | Falls back to gh                                                                          | `Fallbacks:` lists each step; `merge-gh` runs once                                                                       |
| refusal-verbatim  | "Merge PR 12." (the host refuses the merge)                                        | Reports the host's exact error                                                            | `Result: stopped`; `Stopped: 6`; error text reported unchanged                                                           |
| bypass-eligible   | "Merge PR 12, bypass protection." (own PR, `ADMIN`, only a required review blocks) | Runs the admin bypass                                                                     | `Path: bypass`; `Tool: gh pr merge --admin`; `--match-head-commit` is the read head SHA; no extra confirmation question  |
| bypass-ineligible | "Merge PR 12, bypass protection." (another author's PR, or permission `WRITE`)     | Stops with blockers, merges nothing                                                       | `Result: stopped`; `Blockers:` lists the blocker lines and names the failed eligibility condition; no merge command runs |
| head-moved        | "Merge PR 12." (a commit is pushed after the facts were read)                      | Stops, never merges the new head                                                          | Re-read `head.sha` differs; `Result: stopped`; `Tool: none`; `Merge commit: not merged`                                  |
| draft-pr          | "Merge PR 12." (PR is a draft)                                                     | Stops at the stop gates                                                                   | `Result: stopped`; reason says to mark it ready; no question call and no merge command                                   |
| auto-invoke       | A natural request for the action, no `/cdk:` command                               | Claude loads the skill on its own                                                         | The skill runs; the PR is merged after the decision questions                                                            |
| grill-close-call  | A decision question whose top two totals are ≤5 apart                              | Table before the question; no Recommended                                                 | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked     |
| no-approval-step  | "Merge PR 12."                                                                     | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait and no confirmation question; the only question call is Method + Branch cleanup, then the merge runs    |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
