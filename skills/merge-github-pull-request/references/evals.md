# Evals

Cases for `merge-github-pull-request`: standard, bypass, and blocked merges. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id               | prompt                                                   | expected                                  | pass                                                                                                                 |
| ---------------- | -------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| green-squash     | "Merge PR 12." (approved, checks green, own repo branch) | Asks Method and Branch, then squashes     | One question call; `Tool: mcp merge_pull_request`; `merge-parents` is 1                                              |
| bypass-own       | "Merge PR 12." (own PR, ADMIN, review required)          | Asks Bypass or Stop first                 | Blockers listed; `merge-admin` runs only after Bypass; role compared upper-case                                      |
| not-eligible     | "Merge PR 12." (another author, review missing)          | Stops                                     | `Result: stopped`; bypass never offered                                                                              |
| draft            | "Merge PR 12." (draft)                                   | Stops                                     | Report says mark it ready; no merge command                                                                          |
| mcp-down         | "Merge PR 12." (MCP server not connected)                | Falls back to gh                          | `Fallbacks:` lists each step; `merge-gh` runs once                                                                   |
| auto-invoke      | A natural request for the action, no `/cdk:` command     | Claude loads the skill on its own         | The skill runs; its existing confirm or plan approval still precedes any write or push                               |
| grill-close-call | A decision question whose top two totals are ≤5 apart    | Table before the question; no Recommended | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
