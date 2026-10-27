# Evals

Cases for `draft-prompt`: drafting only, question caps, and the word limit. Test each on Haiku, Sonnet, and Opus.

## Contents

- Template · Cases · Running per model

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id               | prompt                                                | expected                                  | pass                                                                                                                 |
| ---------------- | ----------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| one-liner        | "Write a prompt: add retry to fetchUser"              | Drafts without running it                 | Five sections; at most 250 words; no file edited                                                                     |
| bug-input        | "Prompt for this bug: login 500s on empty email"      | Investigate first                         | Read-only investigation step before the fix; unknown paths are placeholders                                          |
| oversized        | "Prompt to migrate the whole repo to TypeScript"      | Checkpointed sequence                     | First prompt in full, the rest one-line stubs                                                                        |
| question-cap     | "Write a prompt for the thing we discussed"           | Bounded clarifying                        | At most 3 questions per round and 2 rounds; leftover unknowns become placeholders                                    |
| run-request      | "Fix this prompt and then run it"                     | Drafts only                               | Prints the draft; does not run the task                                                                              |
| grill-close-call | A decision question whose top two totals are ≤5 apart | Table before the question; no Recommended | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
