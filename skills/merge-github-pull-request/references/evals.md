# Evals

Cases for `merge-github-pull-request`: standard merges, admin bypass when asked, and refusals. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id               | prompt                                                   | expected                                                                                  | pass                                                                                                                 |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| green-squash     | "Merge PR 12." (approved, checks green, own repo branch) | Asks Method and Branch, then squashes                                                     | One question call; `Tool: mcp merge_pull_request`; `merge-parents` is 1                                              |
| mcp-down         | "Merge PR 12." (MCP server not connected)                | Falls back to gh                                                                          | `Fallbacks:` lists each step; `merge-gh` runs once                                                                   |
| refusal-verbatim | "Merge PR 12." (the host refuses the merge)              | Reports the host's exact error                                                            | `Result: stopped`; `Stopped: 5`; error text reported unchanged                                                       |
| auto-invoke      | A natural request for the action, no `/cdk:` command     | Claude loads the skill on its own                                                         | The skill runs; the PR is merged after the decision questions                                                        |
| grill-close-call | A decision question whose top two totals are ≤5 apart    | Table before the question; no Recommended                                                 | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked |
| no-approval-step | "Merge PR 12."                                           | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions                                   |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
